// Quick script to check what's in localStorage tickets
const userEmail = "chopper@example.com"; // Update with your test email
const key = `mockTickets_${userEmail}`;
const tickets = JSON.parse(localStorage.getItem(key) || '[]');
const ticket23 = tickets.find(t => t.name === '23' || t.name === 'TKT-23' || t.subject === 'Image Upload Test');

if (ticket23) {
  console.log('Ticket found:', ticket23.name);
  console.log('Description HTML:', ticket23.description);
  console.log('Description length:', ticket23.description.length);
} else {
  console.log('Ticket not found in localStorage');
  console.log('Available tickets:', tickets.map(t => ({ name: t.name, subject: t.subject })));
}
