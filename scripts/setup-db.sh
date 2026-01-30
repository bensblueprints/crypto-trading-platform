#!/bin/bash

echo "======================================"
echo "  CryptoTrade Database Setup Script"
echo "======================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    exit 1
fi

# Check if DATABASE_URL is already configured
if grep -q "\[PROJECT-REF\]" .env; then
    echo "DATABASE_URL needs to be configured!"
    echo ""
    echo "To get your connection string from Supabase:"
    echo "1. Go to https://supabase.com/dashboard"
    echo "2. Select your project (or create one)"
    echo "3. Go to Settings > Database"
    echo "4. Copy the 'Connection string' (URI format)"
    echo "5. Replace the password placeholder with your database password"
    echo ""
    echo "Then update the .env file with your connection strings"
    exit 1
fi

echo "Checking database connection..."

# Install dependencies if needed
if [ ! -d "node_modules/.prisma" ]; then
    echo "Installing Prisma client..."
    npx prisma generate
fi

# Push schema to database
echo "Pushing schema to database..."
npx prisma db push

if [ $? -eq 0 ]; then
    echo ""
    echo "Database setup complete!"
    echo "Tables created successfully."
    echo ""
    echo "You can now start the app with: npm run dev"
else
    echo ""
    echo "Error: Failed to push schema to database."
    echo "Please check your DATABASE_URL in .env"
fi
