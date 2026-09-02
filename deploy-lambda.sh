#!/bin/bash

set -e

echo "🚀 Starting serverless deployment for Shopulse..."

# Create deployment directory
mkdir -p deployments
cd lambda-functions

# Package chat function
echo "📦 Packaging chat function..."
cd chat-function
npm install --production
zip -r ../../deployments/chat-function.zip . -x "*.git*" "node_modules/.cache/*"
cd ..

# Package products function
echo "📦 Packaging products function..."
cd products-function
npm install --production
zip -r ../../deployments/products-function.zip . -x "*.git*" "node_modules/.cache/*"
cd ..

# Package user function
echo "📦 Packaging user function..."
cd user-function
npm install --production
zip -r ../../deployments/user-function.zip . -x "*.git*" "node_modules/.cache/*"
cd ..

# Move back to project root
cd ..

# Copy zip files to terraform directory
cp deployments/*.zip terraform/

# Deploy with Terraform
echo "🏗️  Deploying infrastructure with Terraform..."
cd terraform

# Initialize Terraform
terraform init

# Plan deployment
echo "📋 Planning Terraform deployment..."
terraform plan

# Apply deployment (uncomment when ready)
# terraform apply -auto-approve

echo "✅ Lambda functions packaged successfully!"
echo "📝 Next steps:"
echo "   1. Set your environment variables in terraform.tfvars"
echo "   2. Run 'terraform apply' in the terraform directory"
echo "   3. Update frontend API endpoints with the output URLs"