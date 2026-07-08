create or replace function create_template(
  p_household_id uuid,
  p_id uuid,
  p_name text,
  p_is_default boolean,
  p_cards jsonb,
  p_assigned_user_ids uuid[]
) returns uuid
language plpgsql security definer as $$
declare
  v_card jsonb;
  v_bill jsonb;
  v_card_id uuid;
begin
  insert into board_templates (id, household_id, name, is_default, created_at, updated_at)
  values (p_id, p_household_id, p_name, p_is_default, now(), now())
  on conflict (id) do update set
    name = excluded.name,
    is_default = excluded.is_default,
    updated_at = now();

  delete from template_assigned_users where template_id = p_id;
  if p_assigned_user_ids is not null then
    insert into template_assigned_users (template_id, user_id, household_id)
    select p_id, unnest(p_assigned_user_ids), p_household_id;
  end if;

  -- Prune cards no longer present in this save (template_bills cascade-deletes
  -- with their parent card via the FK's `on delete cascade`).
  delete from template_pay_date_cards
  where template_id = p_id
    and id <> all (
      select (elem->>'id')::uuid from jsonb_array_elements(p_cards) elem
    );

  -- Prune bills removed from a card that itself still exists (the cascade
  -- above only catches bills whose whole card was removed).
  delete from template_bills
  where template_pay_date_card_id in (
    select id from template_pay_date_cards where template_id = p_id
  )
  and id <> all (
    select (b->>'id')::uuid
    from jsonb_array_elements(p_cards) c,
         jsonb_array_elements(coalesce(c->'bills', '[]'::jsonb)) b
  );

  for v_card in select * from jsonb_array_elements(p_cards)
  loop
    v_card_id := (v_card->>'id')::uuid;
    insert into template_pay_date_cards (
      id, template_id, household_id, assigned_user_id, income_source_id,
      default_pay_amount, default_pay_date, default_pay_date_month_offset,
      board_column, header_color
    ) values (
      v_card_id,
      p_id,
      p_household_id,
      nullif(v_card->>'assignedUserId', '')::uuid,
      nullif(v_card->>'incomeSourceId', '')::uuid,
      (v_card->>'defaultPayAmount')::numeric,
      v_card->>'defaultPayDate',
      coalesce((v_card->>'defaultPayDateMonthOffset')::integer, 0),
      (v_card->>'boardColumn')::smallint,
      v_card->>'headerColor'
    )
    on conflict (id) do update set
      assigned_user_id = excluded.assigned_user_id,
      income_source_id = excluded.income_source_id,
      default_pay_amount = excluded.default_pay_amount,
      default_pay_date = excluded.default_pay_date,
      default_pay_date_month_offset = excluded.default_pay_date_month_offset,
      board_column = excluded.board_column,
      header_color = excluded.header_color;

    for v_bill in select * from jsonb_array_elements(coalesce(v_card->'bills', '[]'::jsonb))
    loop
      insert into template_bills (
        id, template_pay_date_card_id, household_id, master_list_id,
        name, name_override, amount, due_date, category, is_one_off
      ) values (
        (v_bill->>'id')::uuid,
        v_card_id,
        p_household_id,
        nullif(nullif(v_bill->>'masterListId', ''), 'null')::uuid,
        v_bill->>'name',
        nullif(v_bill->>'nameOverride', ''),
        (v_bill->>'amount')::numeric,
        v_bill->>'dueDate',
        v_bill->>'category',
        coalesce((v_bill->>'isOneOff')::boolean, false)
      )
      on conflict (id) do update set
        master_list_id = excluded.master_list_id,
        name = excluded.name,
        name_override = excluded.name_override,
        amount = excluded.amount,
        due_date = excluded.due_date,
        category = excluded.category,
        is_one_off = excluded.is_one_off;
    end loop;
  end loop;

  return p_id;
end;
$$;
