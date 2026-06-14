-- ============================================================
-- Migration: fix "Invalid invite code" when joining a class
--
-- The "classes" table has no SELECT policy that lets a student
-- look up a class by invite_code before they are a member
-- ("students read their classes" requires is_class_member(id),
-- which is false until the membership row exists). The previous
-- select-then-insert flow in MyClasses.tsx therefore always found
-- zero rows, regardless of whether the code was correct.
--
-- Fix: a SECURITY DEFINER function performs the lookup + insert
-- atomically, bypassing RLS internally, without granting broad
-- SELECT access to the classes table (which would let any
-- authenticated user enumerate every class's invite_code).
-- ============================================================

create or replace function join_class_by_invite_code(p_invite_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class_id uuid;
begin
  select id into v_class_id
  from classes
  where invite_code = lower(trim(p_invite_code));

  if v_class_id is null then
    raise exception 'invalid_invite_code';
  end if;

  if exists (
    select 1 from class_memberships
    where class_id = v_class_id and student_id = auth.uid()
  ) then
    raise exception 'already_member';
  end if;

  insert into class_memberships (class_id, student_id)
  values (v_class_id, auth.uid());
end;
$$;

revoke all on function join_class_by_invite_code(text) from public;
grant execute on function join_class_by_invite_code(text) to authenticated;
