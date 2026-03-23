# n8n Setup for ClawPack Social Posting

## Server
- IP: 159.223.42.131
- URL: http://159.223.42.131:5678
- Credentials: ncik@me.com / (stored in secrets.env)

## n8n API
- API Key stored in secrets.env
- Workflow ID: NS7WcozOltwvhrA5

## Setup Commands
```bash
# SSH to server
ssh root@159.223.42.131

# Check Docker status
docker ps

# View n8n logs
docker logs n8n

# Restart n8n
docker restart n8n
```

## Workflow: Social Post Ready
- Webhook path: /webhook/post
- Method: POST
- Body: {"text": "your tweet text"}

## Testing
```bash
curl -X POST "http://159.223.42.131:5678/webhook/post" \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world!"}'
```

## Credential IDs (for API reference)
- Twitter Bearer Token: ehoufbmSi0p2sszC
- Twitter API Basic: 3giEdW5kmlJEPqQB

## Twitter OAuth Setup
1. Go to developer.x.com
2. App permissions: Read and Write
3. Regenerate Access Token + Secret if needed
