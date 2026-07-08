create or replace function create_board(
  p_household_id uuid,
  p_id uuid,
  p_month smallint,
  p_year integer,
  p_label text,
  p_template_id uuid,
  p_status text,
  p_cards jsonb,
  p_notes jsonb
) returns uuid
language plpgsql security definer as $$
declare
  v_card jsonb;
  v_bill jsonb;
  v_note jsonb;
  v_card_id uuid;
begin
  insert into boards (id, household_id, month, year, label, template_id, status, created_at, updated_at)
  values (p_id, p_household_id, p_month, p_year, p_label, p_template_id, p_status, now(), now())
  on conflict (id) do update set
    label = excluded.label,
    status = excluded.status,
    updated_at = now();

  for v_card in select * from jsonb_array_elements(p_cards)
  loop
    v_card_id := (v_card->>'id')::uuid;
    -- owner is NOT NULL on pay_date_cards — must already be a resolved real
    -- uuid by the time this RPC is called (see resolveOwnerUuid on the TS side).
    insert into pay_date_cards (
      id, board_id, household_id, template_pay_date_card_id, owner, source,
      pay_date, pay_amount, is_from_template, sort_order, board_column, header_color
    ) values (
      v_card_id,
      p_id,
      p_household_id,
      nullif(v_card->>'templatePayDateCardId', '')::uuid,
      (v_card->>'owner')::uuid,
      v_card->>'source',
      (v_card->>'payDate')::date,
      nullif(v_card->>'payAmount', '')::numeric,
      coalesce((v_card->>'isFromTemplate')::boolean, false),
      coalesce((v_card->>'sortOrder')::integer, 0),
      (v_card->>'boardColumn')::smallint,
      v_card->>'headerColor'
    )
    on conflict (id) do update set
      owner = excluded.owner,
      source = excluded.source,
      pay_date = excluded.pay_date,
      pay_amount = excluded.pay_amount,
      sort_order = excluded.sort_order,
      board_column = excluded.board_column,
      header_color = excluded.header_color;

    for v_bill in select * from jsonb_array_elements(coalesce(v_card->'bills', '[]'::jsonb))
    loop
      insert into bills (
        id, pay_date_card_id, household_id, creditor_id,
        name, name_override, amount, due_date, category,
        paid, muted, notes, origin, promoted_to_master, row_color
      ) values (
        (v_bill->>'id')::uuid,
        v_card_id,
        p_household_id,
        nullif(v_bill->>'creditorId', '')::uuid,
        v_bill->>'name',
        nullif(v_bill->>'nameOverride', ''),
        (v_bill->>'amount')::numeric,
        v_bill->>'dueDate',
        v_bill->>'category',
        coalesce((v_bill->>'paid')::boolean, false),
        coalesce((v_bill->>'muted')::boolean, false),
        coalesce(v_bill->>'notes', ''),
        coalesce(v_bill->>'origin', 'master'),
        coalesce((v_bill->>'promotedToMaster')::boolean, false),
        v_bill->>'rowColor'
      )
      on conflict (id) do update set
        paid = excluded.paid,
        amount = excluded.amount,
        muted = excluded.muted,
        name = excluded.name,
        due_date = excluded.due_date;
    end loop;

    -- Per-card notes (PayDateCard.notes[]) — pay_date_card_id set, board_id
    -- left unset (NULL), satisfying the notes_exactly_one_parent check.
    for v_note in select * from jsonb_array_elements(coalesce(v_card->'notes', '[]'::jsonb))
    loop
      insert into notes (
        id, pay_date_card_id, household_id, author_id, author_name, text, "timestamp"
      ) values (
        (v_note->>'id')::uuid,
        v_card_id,
        p_household_id,
        (v_note->>'authorId')::uuid,
        v_note->>'authorName',
        v_note->>'text',
        coalesce(nullif(v_note->>'timestamp', '')::timestamptz, now())
      )
      on conflict (id) do nothing;
    end loop;
  end loop;

  -- Board-level notes (MonthlyBoard.sharedNotes[]) — board_id set, pay_date_card_id
  -- left unset (NULL).
  for v_note in select * from jsonb_array_elements(coalesce(p_notes, '[]'::jsonb))
  loop
    insert into notes (
      id, board_id, household_id, author_id, author_name, text, "timestamp"
    ) values (
      (v_note->>'id')::uuid,
      p_id,
      p_household_id,
      (v_note->>'authorId')::uuid,
      v_note->>'authorName',
      v_note->>'text',
      coalesce(nullif(v_note->>'timestamp', '')::timestamptz, now())
    )
    on conflict (id) do nothing;
  end loop;

  return p_id;
end;
$$;
