#!/bin/bash

# Step 1: Login
echo "Logging in..."
curl -s -X POST -H "Content-Type: application/json" -d '{"username":"test","password":"test123"}' http://localhost:5000/api/login -c cookies.txt
echo ""

# Step 2: Get current user info
echo -e "\nGetting user info..."
curl -s -X GET -H "Content-Type: application/json" -b cookies.txt http://localhost:5000/api/user
echo ""

# Step 3: Make user a seller
echo -e "\nMaking user a seller..."
curl -s -X POST -H "Content-Type: application/json" -b cookies.txt http://localhost:5000/api/make-seller
echo ""

# Step 4: Get updated user info
echo -e "\nGetting updated user info..."
curl -s -X GET -H "Content-Type: application/json" -b cookies.txt http://localhost:5000/api/user
echo ""

# Step 5: Create a test product
echo -e "\nCreating test product..."
curl -s -X POST -H "Content-Type: application/json" -b cookies.txt -d '{
  "title": "Test Product",
  "description": "This is a test product",
  "category": "Electronics",
  "condition": "New",
  "price": 100,
  "totalUnits": 10,
  "availableUnits": 10,
  "minOrderQuantity": 1,
  "images": ["https://example.com/image.jpg"],
  "fobLocation": "New York, NY"
}' http://localhost:5000/api/products
echo ""

# Step 6: Get products
echo -e "\nGetting products..."
curl -s -X GET -H "Content-Type: application/json" -b cookies.txt http://localhost:5000/api/products
echo ""
