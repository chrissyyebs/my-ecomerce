fetch('http://localhost:3000/api/orders/checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customer_name: "Test User",
    customer_email: "test@example.com",
    delivery_method: "door",
    shipping_address: { address: "123 Main St", city: "New York", state: "NY" },
    items: [{ product_id: "5b50f85c-fe9f-4f1e-8159-242aa8ecfed8", quantity: 1 }]
  })
}).then(async res => {
  console.log('STATUS:', res.status);
  console.log('BODY:', await res.text());
}).catch(console.error);
