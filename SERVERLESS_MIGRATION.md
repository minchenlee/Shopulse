# Shopulse Serverless Migration Guide

This document outlines the complete migration from the current EC2-based architecture to a fully serverless AWS architecture using Lambda Response Streaming for SSE functionality.

## 🏗️ Architecture Overview

### Before (EC2-based)
- **Frontend**: React app served from EC2
- **Backend**: Express.js on EC2 with load balancer
- **Database**: MongoDB Atlas
- **Real-time**: Server-Sent Events with persistent connections

### After (Serverless)
- **Frontend**: React SPA on S3 + CloudFront
- **Backend**: Individual Lambda functions
- **Database**: MongoDB Atlas (unchanged)
- **Real-time**: Lambda Response Streaming for SSE

## 📁 New Directory Structure

```
lambda-functions/
├── chat-function/          # SSE streaming + chat management
├── products-function/      # Product search and details
└── user-function/         # User management
terraform/
├── s3_frontend.tf         # S3 bucket for frontend
├── cloudfront.tf          # CloudFront distribution
├── dynamodb.tf            # Connection management tables
└── lambda.tf              # Lambda functions and URLs
```

## 🚀 Deployment Steps

### 1. Prepare Environment Variables

Copy and configure environment files:

```bash
# Backend configuration
cp terraform/terraform.tfvars.example terraform/terraform.tfvars
# Edit terraform.tfvars with your actual values

# Frontend configuration  
cp frontend/.env.example frontend/.env.local
# Configure API endpoints (will be updated after deployment)
```

### 2. Deploy Lambda Functions

```bash
# Make deployment script executable
chmod +x deploy-lambda.sh

# Package and prepare Lambda functions
./deploy-lambda.sh
```

### 3. Deploy Infrastructure

```bash
cd terraform

# Initialize Terraform
terraform init

# Plan the deployment
terraform plan

# Apply the changes
terraform apply
```

### 4. Update Frontend Configuration

After successful Terraform deployment, update your frontend environment variables with the Lambda Function URLs from the Terraform output:

```bash
# Get the Lambda Function URLs
terraform output

# Update frontend/.env.production with the URLs
VITE_CHAT_STREAM_URL=https://your-chat-stream-lambda-url
VITE_CHAT_THREADS_URL=https://your-chat-threads-lambda-url  
VITE_PRODUCTS_URL=https://your-products-lambda-url
VITE_USER_URL=https://your-user-lambda-url
```

### 5. Build and Deploy Frontend

```bash
cd frontend

# Build for production with Lambda URLs
npm run build:production

# Deploy to S3 (bucket name from Terraform output)
aws s3 sync dist/ s3://your-s3-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

## ⚡ Key Changes and Benefits

### Lambda Response Streaming for SSE

The chat functionality now uses AWS Lambda Response Streaming, which enables:

- ✅ **Server-Sent Events support** in Lambda
- ✅ **Auto-reconnection** when Lambda times out (15 min limit)
- ✅ **Cost optimization** - pay per request vs. always-on servers
- ✅ **Auto-scaling** based on demand

### Architecture Benefits

1. **Cost Reduction**: Pay only for actual usage instead of running EC2 24/7
2. **Automatic Scaling**: Handle traffic spikes without manual intervention
3. **Zero Server Management**: No patching, updates, or server maintenance
4. **Global Distribution**: CloudFront delivers frontend content globally
5. **High Availability**: Built-in redundancy across AWS regions

### Technical Improvements

- **Connection Management**: DynamoDB stores SSE connection state
- **Function Isolation**: Each service runs in its own Lambda function
- **CORS Handling**: Configured for cross-origin requests
- **Environment Management**: Separate configurations for dev/staging/production

## 🔧 Key Components

### Chat Function (SSE Streaming)
- **File**: `lambda-functions/chat-function/index.js`
- **Purpose**: Handles real-time chat with Server-Sent Events
- **Special**: Uses `awslambda.streamifyResponse` for streaming
- **Timeout**: 15 minutes (maximum Lambda duration)

### Products Function
- **File**: `lambda-functions/products-function/index.js`
- **Purpose**: Product search, filtering, and details
- **MongoDB**: Atlas text search with aggregation pipelines

### User Function
- **File**: `lambda-functions/user-function/index.js`
- **Purpose**: User creation and management
- **Database**: MongoDB user and thread collections

### Frontend Updates
- **File**: `frontend/src/utils/api.jsx`
- **Purpose**: Service-aware API calls to different Lambda functions
- **Fallback**: Graceful fallback to monolithic API during transition

## 🔄 Migration Strategy

### Phase 1: Parallel Deployment
1. Deploy serverless infrastructure alongside existing EC2
2. Test individual components
3. Gradually route traffic to serverless

### Phase 2: Switch Over
1. Update DNS/load balancer to point to CloudFront
2. Monitor performance and error rates
3. Keep EC2 as backup during initial period

### Phase 3: Cleanup
1. Decommission EC2 infrastructure
2. Remove old Terraform resources
3. Update monitoring and alerting

## 🏥 Monitoring and Debugging

### Lambda Function Logs
```bash
# View logs for specific function
aws logs tail /aws/lambda/shopulse-chat-function --follow

# Filter for errors
aws logs filter-log-events --log-group-name /aws/lambda/shopulse-chat-function --filter-pattern "ERROR"
```

### CloudWatch Metrics
Monitor key metrics:
- Lambda duration and errors
- DynamoDB read/write capacity
- CloudFront cache hit ratio
- S3 request metrics

### Debugging SSE Issues
1. Check Lambda function timeout settings
2. Verify DynamoDB connection management
3. Test auto-reconnection in frontend
4. Monitor WebSocket connection patterns

## 💰 Cost Optimization

### Expected Cost Savings
- **Lambda**: Pay per 100ms execution time
- **DynamoDB**: Pay per read/write request
- **S3**: $0.023/GB storage + $0.0004/1K requests
- **CloudFront**: $0.085/GB data transfer

### vs. Current EC2 Costs
- **EC2 instances**: ~$30-50/month per instance
- **Load balancer**: ~$20/month
- **Data transfer**: Similar to CloudFront

**Estimated savings**: 60-80% for typical traffic patterns

## 🚨 Important Considerations

### Lambda Limitations
- **15-minute timeout**: SSE connections will close and reconnect
- **Cold starts**: First request may have higher latency
- **Concurrent executions**: Default limit of 1,000 (can be increased)

### Frontend Changes Required
- Update API endpoints to Lambda Function URLs
- Handle auto-reconnection for SSE streams
- Test all user flows thoroughly

### Database Considerations
- MongoDB Atlas works seamlessly with Lambda
- Connection pooling handled automatically
- No schema changes required

## 🔍 Testing Checklist

### Backend Testing
- [ ] All Lambda functions deploy successfully
- [ ] Environment variables properly configured
- [ ] MongoDB connections working
- [ ] CORS headers properly set
- [ ] Error handling and logging functional

### Frontend Testing
- [ ] S3 static hosting working
- [ ] CloudFront distribution serving content
- [ ] API calls routing to correct Lambda functions
- [ ] SSE auto-reconnection working
- [ ] All user flows functional

### Integration Testing
- [ ] Chat streaming works end-to-end
- [ ] Product search and filtering
- [ ] User creation and management
- [ ] Cross-browser compatibility
- [ ] Mobile responsiveness

## 📞 Support and Rollback

### Rollback Plan
If issues arise, the original EC2 infrastructure remains available:
1. Update DNS to point back to EC2 load balancer
2. Restart EC2 instances if stopped
3. Verify all services operational
4. Investigate serverless issues offline

### Getting Help
- Check AWS Lambda documentation for response streaming
- Review CloudFormation/Terraform logs for deployment issues
- Monitor CloudWatch logs for runtime errors
- Test individual Lambda functions via AWS console

---

🎉 **Congratulations!** You've successfully migrated Shopulse to a modern, serverless architecture with significant cost savings and improved scalability!