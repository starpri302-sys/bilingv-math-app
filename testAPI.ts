import pool from './db';
import jwt from 'jsonwebtoken';

async function test() {
  const token = jwt.sign({ id: 'admin', role: 'super_admin', subscription_tier: 'pro' }, process.env.JWT_SECRET || 'your_jwt_secret');
  
  const res = await fetch('http://localhost:3000/api/courses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      subject_id: 's1',
      title_ru: 'Test',
      title_tyv: 'Test',
      description_ru: 'Test',
      description_tyv: 'Test',
      image_url: 'Test'
    })
  });
  
  console.log(res.status);
  console.log(await res.text());
}

test().catch(console.error);
