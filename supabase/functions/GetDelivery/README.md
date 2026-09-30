# GetDelivery API Documentation

## Endpoint
`POST /api/mt/GetDelivery`

## Description
Retrieves delivery information for the authenticated user or admin. Supports filtering by delivery ID, user ID, date, and status.

## Authentication
Requires valid Supabase authentication token in the `Authorization` header.

## Request

### Headers
```
Authorization: Bearer <supabase_access_token>
Content-Type: application/json
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `deliveryId` | string | No | Get specific delivery by ID |
| `userId` | string | No | Filter by user ID (admin only) |
| `date` | string | No | Filter by delivery date (YYYY-MM-DD) |
| `status` | string | No | Filter by status (pending, assigned, delivered, cancelled) |

### Examples

**Get all deliveries for current user:**
```
GET /api/mt/GetDelivery
```

**Get specific delivery:**
```
GET /api/mt/GetDelivery?deliveryId=123e4567-e89b-12d3-a456-426614174000
```

**Get deliveries for specific date:**
```
GET /api/mt/GetDelivery?date=2026-01-11
```

**Get pending deliveries:**
```
GET /api/mt/GetDelivery?status=pending
```

**Admin: Get deliveries for specific user:**
```
GET /api/mt/GetDelivery?userId=user-id-here
```

## Response

### Success Response (Multiple Deliveries)

**Status Code:** `200 OK`

```json
{
  "success": true,
  "deliveries": [
    {
      "id": "delivery-id",
      "user_id": "user-id",
      "product_id": "product-id",
      "subscription_id": "subscription-id",
      "quantity": 2,
      "delivery_date": "2026-01-11",
      "status": "pending",
      "delivery_boy_id": null,
      "assigned_at": null,
      "assigned_by": null,
      "delivered_at": null,
      "notes": null,
      "area": "Jubilee Hills",
      "created_at": "2026-01-10T10:00:00Z",
      "profiles": {
        "id": "user-id",
        "full_name": "John Doe",
        "email": "john@example.com",
        "phone": "9876543210",
        "address": "123 Main St",
        "area": "Jubilee Hills"
      },
      "products": {
        "id": "product-id",
        "name": "Fresh Milk",
        "category": "Milk",
        "price": 50,
        "image_url": "https://..."
      },
      "subscriptions": {
        "id": "subscription-id",
        "daily_quantity": 2,
        "is_active": true
      }
    }
  ],
  "count": 1
}
```

### Success Response (Single Delivery)

**Status Code:** `200 OK`

```json
{
  "success": true,
  "delivery": {
    "id": "delivery-id",
    "user_id": "user-id",
    "product_id": "product-id",
    "subscription_id": "subscription-id",
    "quantity": 2,
    "delivery_date": "2026-01-11",
    "status": "pending",
    "delivery_boy_id": null,
    "assigned_at": null,
    "assigned_by": null,
    "delivered_at": null,
    "notes": null,
    "area": "Jubilee Hills",
    "created_at": "2026-01-10T10:00:00Z",
    "profiles": {
      "id": "user-id",
      "full_name": "John Doe",
      "email": "john@example.com",
      "phone": "9876543210",
      "address": "123 Main St",
      "area": "Jubilee Hills"
    },
    "products": {
      "id": "product-id",
      "name": "Fresh Milk",
      "category": "Milk",
      "price": 50,
      "image_url": "https://..."
    },
    "subscriptions": {
      "id": "subscription-id",
      "daily_quantity": 2,
      "is_active": true
    }
  }
}
```

### Error Responses

**Unauthorized (401)**
```json
{
  "error": "Unauthorized"
}
```

**Internal Server Error (500)**
```json
{
  "success": false,
  "error": "Error message here"
}
```

## Delivery Status Values

| Status | Description |
|--------|-------------|
| `pending` | Delivery scheduled but not assigned |
| `assigned` | Assigned to delivery boy |
| `delivered` | Successfully delivered |
| `cancelled` | Delivery cancelled |

## Access Control

### Customer Users:
- Can only view their own deliveries
- Cannot specify `userId` parameter
- Automatically filtered to their user ID

### Admin Users:
- Can view all deliveries
- Can filter by any `userId`
- Can see all delivery details

## Usage Examples

### JavaScript/TypeScript

```typescript
// Get all deliveries for current user
const response = await fetch(
  'https://your-project.supabase.co/functions/v1/GetDelivery',
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  }
);
const data = await response.json();
console.log(data.deliveries);

// Get specific delivery
const response = await fetch(
  'https://your-project.supabase.co/functions/v1/GetDelivery?deliveryId=123',
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  }
);
const data = await response.json();
console.log(data.delivery);

// Get deliveries for specific date
const response = await fetch(
  'https://your-project.supabase.co/functions/v1/GetDelivery?date=2026-01-11',
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  }
);
const data = await response.json();
console.log(data.deliveries);
```

### cURL

```bash
# Get all deliveries
curl -X GET \
  'https://your-project.supabase.co/functions/v1/GetDelivery' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN'

# Get specific delivery
curl -X GET \
  'https://your-project.supabase.co/functions/v1/GetDelivery?deliveryId=123' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN'

# Get deliveries by date
curl -X GET \
  'https://your-project.supabase.co/functions/v1/GetDelivery?date=2026-01-11' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN'
```

## Deployment

### Deploy to Supabase

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy the function
supabase functions deploy GetDelivery
```

### Set Environment Variables

The function uses these environment variables (automatically set by Supabase):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## Testing

### Local Testing

```bash
# Start Supabase locally
supabase start

# Serve the function locally
supabase functions serve GetDelivery

# Test the function
curl -X GET \
  'http://localhost:54321/functions/v1/GetDelivery' \
  -H 'Authorization: Bearer YOUR_LOCAL_TOKEN'
```

## Notes

- All dates should be in `YYYY-MM-DD` format
- Deliveries are ordered by delivery date (newest first)
- The API automatically includes related data (user profile, product details, subscription info)
- Admin users can access all deliveries, regular users only see their own

## Related APIs

- `CreateDelivery` - Create new delivery
- `UpdateDelivery` - Update delivery status
- `AssignDeliveryBoy` - Assign delivery to delivery boy
- `GetDeliveryStats` - Get delivery statistics

## Support

For issues or questions, refer to:
- Supabase Edge Functions docs: https://supabase.com/docs/guides/functions
- Project documentation: See `README.md`
