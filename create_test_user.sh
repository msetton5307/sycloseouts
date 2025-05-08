#!/bin/bash

echo "Creating test user..."
curl -s -X POST -H "Content-Type: application/json" -d '{
  "username": "testuser",
  "password": "password123",
  "email": "test@example.com",
  "firstName": "Test",
  "lastName": "User",
  "role": "buyer"
}' http://localhost:5000/api/register
echo ""
