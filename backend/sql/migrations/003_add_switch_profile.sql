alter table device_outputs
  drop constraint if exists device_outputs_profile_type_check;

alter table device_outputs
  add constraint device_outputs_profile_type_check
  check (profile_type in ('light', 'gate', 'cover', 'generic_relay', 'switch'));
