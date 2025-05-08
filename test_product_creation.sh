#!/bin/bash

# Step 1: Login
echo "Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d '{"username":"test","password":"test123"}' http://localhost:5000/api/login)
echo "Login response: $LOGIN_RESPONSE"

# Step 2: Get current user info
echo -e "\nGetting user info..."
USER_INFO=$(curl -s -X GET -H "Content-Type: application/json" --cookie-jar cookies.txt http://localhost:5000/api/user)
echo "User info: $USER_INFO"

# Step 3: Make user a seller
echo -e "\nMaking user a seller..."
MAKE_SELLER_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" --cookie cookies.txt http://localhost:5000/api/make-seller)
echo "Make seller response: $MAKE_SELLER_RESPONSE"

# Step 4: Get updated user info
echo -e "\nGetting updated user info..."
UPDATED_USER_INFO=$(curl -s -X GET -H "Content-Type: application/json" --cookie cookies.txt http://localhost:5000/api/user)
echo "Updated user info: $UPDATED_USER_INFO"

# Step 5: Create a test product
echo -e "\nCreating test product..."
CREATE_PRODUCT_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" --cookie cookies.txt -d '{
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
}' http://localhost:5000/api/products)
echo "Create product response: $CREATE_PRODUCT_RESPONSE"

# Step 6: Get products
echo -e "\nGetting products..."
GET_PRODUCTS_RESPONSE=$(curl -s -X GET -H "Content-Type: application/json" --cookie cookies.txt http://localhost:5000/api/products)
echo "Products: $GET_PRODUCTS_RESPONSE"
