# Infrastructure & Maps — Steering

## My Ownership
- src/lib/maps/
- src/lib/route-optimizer.ts
- src/lib/csv-parser.ts
- src/app/api/customers/import/
- src/components/map/
- supabase/migrations/

## Rules
- Never redefine types that exist in src/types/
- Always import Customer, RankedCustomer from src/types/customer.ts
- Always import OptimizedRoute, RouteStop, MapboxRouteGeometry,
  MapboxTravelMatrix from src/types/route.ts
- Mapbox token comes from NEXT_PUBLIC_MAPBOX_TOKEN
- Supabase client uses existing project credentials
- Always include a mock/fallback if an external API is unavailable
