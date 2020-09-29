module.exports = {
  listingStatus: "SELECT DISTINCT(events.id_listing) as id_listing, events.start_date, events.end_date, events.guest_name, events.id_event, events.type FROM events JOIN listings ON events.id_listing = listings.id_listing WHERE type IN ('Busy','Not available') AND listings.delete_date IS NULL AND events.id_listing = ANY($1) AND (start_date::date < $3 AND end_date::date > $2)",
  groupQuery: 'SELECT * FROM groups WHERE visible = 1',
  categoryQuery: 'SELECT categories.*, transition_groups.transition_type, transition_groups.name, transition_groups.permitted FROM categories JOIN transition_groups ON categories.transitions_group_id = transition_groups.id',
  menuQuery: 'SELECT * FROM app_menu',
  permissionQuery: 'SELECT * FROM permissions',
};
