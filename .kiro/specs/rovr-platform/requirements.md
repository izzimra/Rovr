# Requirements Document

## Introduction

Rovr is an AI-powered field sales intelligence dashboard that helps sales representatives plan high-ROI customer visits. Sales reps upload a CSV of customer locations and metrics, and Rovr uses Gemini to rank prospects, Mapbox to optimize travel, and a live dashboard to surface KPIs, insights, and a conversational copilot. The platform runs on Next.js 15 (App Router) with TypeScript, Tailwind, shadcn/ui, Framer Motion, Zustand, and Recharts on the frontend, and Supabase (Auth + Postgres + Row Level Security), Mapbox (GL JS, Directions, Matrix), and the Gemini API on the backend. Production deployment targets AWS (Amplify, S3, CloudFront, Secrets Manager, CloudWatch, IAM); the current implementation remains local-first until the infrastructure teammate lands the first AWS deployment.

This spec is scoped for a hackathon-grade MVP, not an enterprise rollout. All integrations are live: Supabase, Mapbox, and Gemini are required at runtime. Authentication is handled by Supabase Auth with an OAuth sign-in flow (no email/password). Copilot conversation history is session-only (not persisted to the Data_Store). Analytics describe the current session only, not historical trends. The dashboard ships with a seeded demo dataset so first-time users and live demos never see an empty screen.

## Glossary

- **Rovr_Platform**: The full Rovr web application (frontend plus backend).
- **Rovr_Frontend**: The Next.js 15 App Router application delivered to the browser.
- **Rovr_Backend**: The Next.js server routes and server actions that mediate calls to Supabase, Mapbox, and Gemini.
- **Auth_Service**: The Supabase Auth subsystem used exclusively for OAuth sign-in.
- **Data_Store**: The Supabase Postgres database with Row Level Security policies, accessed through the authenticated Supabase client bound to the current Session.
- **RLS_Policy**: A Supabase Row Level Security policy that restricts row access to `auth.uid() = user_id`.
- **CSV_Import_Service**: The module that parses uploaded CSV files and writes customer rows to the Data_Store.
- **Customer_Record**: A row in the `customers` table with columns `customer_name`, `latitude`, `longitude`, `sales_value`, `priority`, `last_visit_days`, `potential_score`, plus `user_id`.
- **Prioritization_Service**: The server module that calls the Gemini API to rank Customer_Records and return structured explanations.
- **Gemini_Client**: The server-side client that invokes `generateContent` on the Gemini API.
- **Route_Optimizer**: The server module that uses the Mapbox Directions API and the Mapbox Matrix API to compute an ordered visit sequence, polyline geometry, and per-leg estimates.
- **Mapbox_Client**: The Mapbox GL JS SDK loaded in the browser and the server-side Mapbox Directions/Matrix client.
- **Map_View**: The frontend component that renders markers, the route polyline, numbered stops, and travel estimates via Mapbox GL JS.
- **KPI_Dashboard**: The top bar of the main dashboard displaying Estimated Revenue, Route Efficiency, Travel Saved, and Priority Customers.
- **Insights_Service**: The server module that calls Gemini to produce the daily sales brief, route reasoning, high-ROI opportunities, and strategy suggestions.
- **Copilot_Chat**: The right-hand conversational assistant panel backed by Gemini, with conversation history held in Zustand/session memory only.
- **Analytics_View**: The Recharts-based revenue and travel analytics component scoped to the current session's data.
- **Dashboard_Layout**: The main authenticated page with TOP KPI bar, LEFT ranked list, CENTER Map_View, and RIGHT Copilot_Chat.
- **UX_Theme**: The dark-mode visual system using glassmorphism, blue/purple gradients, `rounded-xl` corners, Framer Motion transitions, and the AI_Loading_Experience.
- **AI_Loading_Experience**: The consistent set of loading affordances rendered during AI operations, including shimmer placeholders, typing indicators, animated KPI tile placeholders, and progressive rendering of AI responses.
- **Priority_Tier**: The tier assigned to a Customer_Record based on its `priority` column value; the three tiers are High, Medium, and Low with explicit thresholds defined in the Visual Priority States requirement.
- **Demo_Mode**: A user-triggerable mode that loads a pre-seeded scenario (customers, rankings, route, insights, KPIs) to de-risk live demos without depending on the user's own uploads.
- **Mock_Data_Seed**: A curated dataset of sample Customer_Records with plausible `latitude`/`longitude` coverage across a single metro area plus precomputed rankings, route, insights, and KPI values used for first-load seeding and Demo_Mode.
- **Session**: An authenticated Supabase session bound to a single `auth.uid()`.
- **Env_Contract**: The set of required environment variables that the Rovr_Platform reads at startup.
- **Cloud_Infrastructure**: The future-facing AWS deployment surface (Amplify for frontend hosting, S3 for object storage, CloudFront for CDN, Secrets Manager for credentials, CloudWatch for observability, and IAM for access control).

## Requirements

### Requirement 1: Authentication and Session Management

**User Story:** As a field sales representative, I want to sign in with my work account, so that I can access my own customer data and plan routes securely.

#### Acceptance Criteria

1. WHEN an unauthenticated visitor requests any route other than the sign-in route, THE Rovr_Frontend SHALL redirect the visitor to the sign-in route.
2. WHEN a user selects the OAuth sign-in action, THE Auth_Service SHALL initiate the Supabase OAuth flow and, on success, establish a Session.
3. IF the Auth_Service rejects the OAuth response, THEN THE Rovr_Frontend SHALL display an authentication error message and keep the user on the sign-in route.
4. WHEN a user selects "Sign out", THE Auth_Service SHALL terminate the Session and THE Rovr_Frontend SHALL redirect the user to the sign-in route.
5. THE Rovr_Frontend SHALL initiate a sign-out redirect only in response to an explicit user sign-out action and SHALL NOT initiate an automatic sign-out redirect based on idle timeouts or other non-user-triggered conditions.
6. WHILE a Session is active, THE Rovr_Backend SHALL attach the Session's `auth.uid()` to every request made to the Data_Store.
7. IF a Session expires or is invalidated, THEN THE Rovr_Frontend SHALL redirect the user to the sign-in route on the next authenticated request.

### Requirement 2: Per-User Data Isolation via RLS

**User Story:** As a sales rep, I want my customer data isolated from other users, so that my pipeline stays confidential.

#### Acceptance Criteria

1. THE Data_Store SHALL store every user-owned row with a `user_id` column populated from `auth.uid()` at insert time.
2. THE Data_Store SHALL enforce an RLS_Policy on every user-owned table that restricts SELECT, INSERT, UPDATE, and DELETE to rows where `user_id = auth.uid()`.
3. IF an RLS_Policy is not active on a user-owned table at query time, THEN THE Data_Store SHALL fail closed and reject all access to that table.
4. WHEN a user queries a user-owned table, THE Data_Store SHALL return only rows where `user_id` equals the current Session's `auth.uid()`.
5. IF a request attempts to write a row with a `user_id` value different from the current Session's `auth.uid()`, THEN THE Data_Store SHALL reject the write.
6. THE Rovr_Backend SHALL execute all user-data queries using the authenticated Supabase client bound to the current Session.

### Requirement 3: CSV Customer Upload

**User Story:** As a sales rep, I want to upload a CSV of my customers, so that Rovr can analyze and route them.

#### Acceptance Criteria

1. THE Rovr_Frontend SHALL provide a CSV upload control on the dashboard accessible to authenticated users.
2. THE CSV_Import_Service SHALL accept CSV files with the header columns `customer_name`, `latitude`, `longitude`, `sales_value`, `priority`, `last_visit_days`, and `potential_score`.
3. WHEN a user uploads a CSV file, THE CSV_Import_Service SHALL parse each data row into a Customer_Record and write the records to the Data_Store with `user_id` set to the current Session's `auth.uid()`.
4. IF a CSV file is missing one or more of the required header columns, THEN THE CSV_Import_Service SHALL reject the file and THE Rovr_Frontend SHALL display a message listing the missing columns.
5. IF a CSV row contains a non-numeric value for `latitude`, `longitude`, `sales_value`, `priority`, `last_visit_days`, or `potential_score`, THEN THE CSV_Import_Service SHALL skip that row, record a per-row error entry, and increment the skipped-row count immediately when the row is processed.
6. IF a CSV row contains `latitude` outside the range [-90, 90] or `longitude` outside the range [-180, 180], THEN THE CSV_Import_Service SHALL skip that row, record a per-row error entry, and increment the skipped-row count immediately when the row is processed.
7. WHEN CSV parsing completes, THE Rovr_Frontend SHALL display the count of imported rows and the count of skipped rows with their error reasons.
8. WHEN CSV import succeeds with at least one imported row, THE Rovr_Frontend SHALL refresh the ranked list, Map_View, and KPI_Dashboard to reflect the newly imported Customer_Records.

### Requirement 4: AI Customer Prioritization

**User Story:** As a sales rep, I want Gemini to rank my customers by expected value, so that I visit the highest-impact prospects first.

#### Acceptance Criteria

1. WHEN a user requests prioritization or a CSV import completes, THE Prioritization_Service SHALL send the current user's Customer_Records to the Gemini_Client using `generateContent`.
2. THE Prioritization_Service SHALL request a response schema that returns, for each Customer_Record, a numeric rank, a priority score, and a short natural-language explanation.
3. WHEN the Gemini_Client returns a valid ranked response, THE Rovr_Backend SHALL persist the rank, score, and explanation to the Data_Store keyed to the corresponding Customer_Record and `user_id`.
4. WHEN rankings are available, THE Rovr_Frontend SHALL display Customer_Records in the LEFT ranked list ordered by rank ascending, with the explanation visible on hover or expansion.
5. WHERE a Customer_Record has a Gemini-provided explanation but no available rank, THE Rovr_Frontend SHALL render the explanation on hover or expansion for that Customer_Record even when ranked results are unavailable.
6. IF the Gemini API returns an error or malformed response, THEN THE Prioritization_Service SHALL attempt the call up to three total times (one initial attempt plus up to two retries) with exponential backoff before surfacing a user-visible failure message.
7. WHILE prioritization is in progress, THE Rovr_Frontend SHALL render the AI_Loading_Experience on the ranked list.

### Requirement 5: Route Optimization

**User Story:** As a sales rep, I want an optimized driving route across my top customers, so that I minimize travel and maximize ROI per day.

#### Acceptance Criteria

1. WHEN a user requests route optimization, THE Route_Optimizer SHALL select the top-N priority Customer_Records for the current user up to a configurable maximum stop count.
2. THE Route_Optimizer SHALL compute the visit order using one of two interchangeable strategies: (a) a single Mapbox Directions API call with optimized waypoint ordering enabled, or (b) a greedy nearest-neighbor heuristic over the selected top-N stops starting from the user's configured origin, optionally informed by Mapbox Matrix API travel-time data.
3. THE Route_Optimizer SHALL call the Mapbox Directions API with the computed ordered stops to obtain the final route geometry and leg-by-leg travel estimates.
4. WHEN optimization completes, THE Rovr_Backend SHALL return the ordered stop list, per-leg travel estimates, total distance, and total duration to the Rovr_Frontend.
5. WHERE zero Customer_Records are selected for optimization, THE Route_Optimizer SHALL return success with an empty ordered stop list, an empty per-leg estimate list, a total distance of zero, and a total duration of zero.
6. IF the Mapbox Directions API or Mapbox Matrix API returns a non-OK status or an error, THEN THE Route_Optimizer SHALL surface a user-visible error and leave the previously computed route, if any, unchanged.
7. WHILE route optimization is in progress, THE Rovr_Frontend SHALL render the AI_Loading_Experience on the Map_View and KPI_Dashboard until the Route_Optimizer explicitly reports completion or a terminal error.

### Requirement 6: Mapbox Visualization

**User Story:** As a sales rep, I want to see my customers and optimized route on a map, so that I can visualize the day's plan.

#### Acceptance Criteria

1. THE Map_View SHALL render Mapbox GL JS centered on the current user's stops, using the dark-mode map style aligned with the UX_Theme.
2. WHEN Customer_Records are loaded, THE Map_View SHALL render one marker per Customer_Record at the record's `latitude` and `longitude`.
3. WHEN an optimized route is available, THE Map_View SHALL render a polyline along the Mapbox Directions route geometry and numbered stop markers in visit order.
4. WHEN a marker or numbered stop is selected, THE Map_View SHALL display the Customer_Record's name, priority, and estimated leg travel time.
5. WHILE the Map_View fallback panel is displayed because Mapbox GL JS is unavailable, THE Map_View SHALL keep Customer_Record selection enabled in the textual stop list so selecting a stop still displays its name, priority, and estimated leg travel time.
6. IF Mapbox GL JS fails to load, THEN THE Map_View SHALL display a fallback panel indicating that the map is unavailable and list the stops in textual order.

### Requirement 7: KPI Dashboard

**User Story:** As a sales rep, I want to see my daily KPIs at a glance, so that I can gauge the value of the planned route.

#### Acceptance Criteria

1. THE KPI_Dashboard SHALL display four KPI tiles at the TOP of the Dashboard_Layout: Estimated Revenue, Route Efficiency, Travel Saved, and Priority Customers.
2. THE KPI_Dashboard SHALL compute Estimated Revenue as the sum of `sales_value` across the stops in the current optimized route.
3. THE KPI_Dashboard SHALL compute Route Efficiency as the ratio of Estimated Revenue to total route duration in hours.
4. THE KPI_Dashboard SHALL compute Travel Saved as the signed difference between the travel time of the priority-only sequence and the travel time of the optimized sequence, permitting negative values when the optimized sequence takes longer than the priority-only sequence.
5. THE KPI_Dashboard SHALL compute Priority Customers as the count of Customer_Records in the current optimized route whose Priority_Tier is High.
6. WHEN Customer_Records, rankings, or the optimized route change, THE KPI_Dashboard SHALL recompute and rerender all four KPI tiles.
7. WHILE underlying data is loading, THE KPI_Dashboard SHALL render the AI_Loading_Experience on the affected tiles regardless of whether a prior tile render is still visible or has failed to rerender.

### Requirement 8: AI-Generated Business Insights

**User Story:** As a sales rep, I want a daily brief and route reasoning, so that I understand why the plan looks the way it does and where the biggest opportunities are.

#### Acceptance Criteria

1. WHEN the optimized route and rankings are available, THE Insights_Service SHALL call the Gemini_Client to generate four insight sections: Daily Sales Brief, Route Reasoning, High-ROI Opportunities, and Strategy Suggestions.
2. THE Insights_Service SHALL pass the current user's Customer_Records, rankings, and optimized route summary as structured context in the Gemini prompt.
3. WHEN Gemini returns valid insight content, THE Rovr_Frontend SHALL render the four sections in a dedicated insights panel within the Dashboard_Layout.
4. IF the Gemini API returns an error or malformed insight content, THEN THE Insights_Service SHALL attempt the call up to three total times (one initial attempt plus up to two retries) with exponential backoff and, on continued failure, THE Rovr_Frontend SHALL display a fallback message in the affected section.
5. WHILE insights are being generated, THE Rovr_Frontend SHALL render the AI_Loading_Experience in each of the four insight sections.
6. IF insight generation for a section fails immediately without entering a loading state, THEN THE Rovr_Frontend SHALL display the fallback message for that section without first rendering the AI_Loading_Experience for that section.

### Requirement 9: AI Copilot Chat

**User Story:** As a sales rep, I want a conversational assistant on my dashboard, so that I can ask questions about my pipeline and route in natural language.

#### Acceptance Criteria

1. THE Copilot_Chat SHALL occupy the RIGHT panel of the Dashboard_Layout and be visible to authenticated users.
2. WHEN a user submits a chat message, THE Rovr_Backend SHALL call the Gemini_Client with the message, the current user's Customer_Records summary, the current rankings, and the current optimized route as structured context.
3. WHEN the Gemini_Client returns a response, THE Copilot_Chat SHALL append the response to the conversation history held in the Zustand store for the current Session.
4. THE Copilot_Chat SHALL retain conversation history only in Zustand/session memory scoped to the current Session and SHALL NOT persist conversation history to the Data_Store.
5. WHEN a user signs out, THE Copilot_Chat SHALL discard the in-memory conversation history.
6. WHERE a Session ends without an explicit user sign-out (for example, due to session timeout or invalidation), THE Copilot_Chat SHALL retain the in-memory conversation history and SHALL discard it only on an explicit user sign-out.
7. IF the Gemini API returns an error, THEN THE Copilot_Chat SHALL display an inline error message and preserve the user's unsent input for retry.
8. WHILE a Copilot_Chat response is being generated, THE Copilot_Chat SHALL render the AI_Loading_Experience in the conversation thread.

### Requirement 10: Current-Session Revenue and Travel Analytics

**User Story:** As a sales rep, I want charts of my revenue and travel metrics for the current session, so that I can see the shape of today's plan at a glance.

#### Acceptance Criteria

1. THE Analytics_View SHALL render Recharts-based visualizations for Estimated Revenue by stop, Sales Value distribution across the current Customer_Records, and Travel Time per leg of the current optimized route.
2. THE Analytics_View SHALL derive every chart from the current session's Customer_Records, rankings, and optimized route, and SHALL NOT render historical or time-series views across prior imports or prior sessions.
3. WHEN Customer_Records, rankings, or the optimized route change, THE Analytics_View SHALL rerender the affected charts.
4. THE Analytics_View SHALL apply the UX_Theme dark-mode palette to chart axes, gridlines, tooltips, and series colors.
5. WHEN a user hovers a chart data point, THE Analytics_View SHALL display a tooltip with the underlying numeric values and the associated Customer_Record name where applicable.
6. IF a chart has no data for the current session, THEN THE Analytics_View SHALL display an empty-state placeholder for that chart.

### Requirement 11: Dashboard Layout

**User Story:** As a sales rep, I want a clear dashboard layout, so that I can see KPIs, prospects, the map, and the copilot without switching screens.

#### Acceptance Criteria

1. THE Dashboard_Layout SHALL place the KPI_Dashboard across the TOP of the authenticated dashboard page.
2. THE Dashboard_Layout SHALL place the ranked Customer_Record list on the LEFT of the authenticated dashboard page.
3. THE Dashboard_Layout SHALL place the Map_View in the CENTER of the authenticated dashboard page.
4. THE Dashboard_Layout SHALL place the Copilot_Chat on the RIGHT of the authenticated dashboard page.
5. WHERE Customer_Record, ranking, route, or Copilot_Chat conversation state is shared across two or more of the four panels, THE Dashboard_Layout SHALL use Zustand stores as the state-sharing mechanism, and THE Dashboard_Layout SHALL NOT require Zustand for state scoped to a single panel with no cross-panel sharing.

### Requirement 12: Premium Dark-Mode UX

**User Story:** As a sales rep, I want a premium-feeling dark interface, so that the product feels polished and trustworthy.

#### Acceptance Criteria

1. THE UX_Theme SHALL apply a dark-mode palette with blue and purple gradients as the default and only theme.
2. THE UX_Theme SHALL apply glassmorphism effects (translucent backgrounds with backdrop blur) to panels, cards, and the Copilot_Chat surface.
3. THE UX_Theme SHALL apply `rounded-xl` corner radius to cards, KPI tiles, chat bubbles, and modal containers.
4. WHEN a panel mounts, updates, or transitions, THE UX_Theme SHALL apply Framer Motion transitions with a configured standard duration and easing.
5. WHILE any AI-powered operation (prioritization, route optimization, insights, copilot) is in progress, THE UX_Theme SHALL render the AI_Loading_Experience.
6. THE Rovr_Frontend SHALL use shadcn/ui primitives styled with Tailwind for buttons, inputs, dialogs, and menus under the UX_Theme.

### Requirement 13: Responsive Layout

**User Story:** As a sales rep using a laptop or tablet, I want the dashboard to adapt to my screen size, so that I can review my plan comfortably on either device.

#### Acceptance Criteria

1. WHERE the viewport width is at or above 1280px, THE Dashboard_Layout SHALL render the TOP, LEFT, CENTER, and RIGHT panels simultaneously as the first-class experience, including the TOP panel regardless of whether its content is primary or secondary (for example, branding or secondary navigation).
2. WHERE the viewport width is between 768px and 1279px, THE Dashboard_Layout SHALL collapse the Copilot_Chat into a toggleable drawer on the RIGHT while keeping the KPI_Dashboard, ranked list, and Map_View visible.
3. THE Rovr_Frontend SHALL preserve readability of KPI_Dashboard tile values, ranked list entries, and Copilot_Chat messages across the two viewport ranges defined above.

### Requirement 14: Visual Priority States

**User Story:** As a sales rep, I want the ranked list, map markers, and KPI tiles to visually differentiate priority tiers, so that I can instantly spot the highest-value stops.

#### Acceptance Criteria

1. THE Rovr_Frontend SHALL assign a Priority_Tier to each Customer_Record based on the record's `priority` column using the thresholds: `priority` >= 8 is High, 4 <= `priority` < 8 is Medium, `priority` < 4 is Low.
2. THE ranked Customer_Record list SHALL render a shadcn-style badge for each entry labeled with the Priority_Tier name.
3. THE ranked Customer_Record list SHALL apply a bright blue-to-purple glow or shadow accent to entries with Priority_Tier High, a muted accent to entries with Priority_Tier Medium, and a subdued accent to entries with Priority_Tier Low.
4. IF a Priority_Tier visual accent fails to render on the ranked list, Map_View, or KPI_Dashboard for a Customer_Record, THEN THE Rovr_Frontend SHALL continue to render the affected surface with its underlying content and SHALL NOT block the surface on the accent failure.
5. THE Map_View SHALL color-code markers for each Customer_Record using a gradient accent keyed to Priority_Tier, with High rendered in the brightest blue/purple, Medium in a muted variant, and Low in a subdued variant.
6. THE KPI_Dashboard Priority Customers tile SHALL apply the High Priority_Tier glow accent when its count is greater than zero.
7. THE Rovr_Frontend SHALL maintain consistent Priority_Tier color mapping across the ranked list, Map_View markers, and KPI_Dashboard tiles.

### Requirement 15: AI Loading Experience

**User Story:** As a sales rep, I want a consistent and polished loading experience during AI operations, so that the product feels responsive and intentional even while Gemini and Mapbox calls are in flight.

#### Acceptance Criteria

1. WHILE any card or list is awaiting AI-sourced content, THE AI_Loading_Experience SHALL render shimmer placeholders sized to the final content dimensions.
2. WHERE two or more AI operations are in progress concurrently (for example, Copilot_Chat response generation, KPI recomputation, and card/list content loading), THE AI_Loading_Experience SHALL render the applicable loading affordance for each in-progress operation simultaneously.
3. WHILE the Copilot_Chat is awaiting a Gemini response, THE AI_Loading_Experience SHALL render a typing indicator inside the conversation thread.
4. WHILE a KPI tile is awaiting a recomputed value, THE AI_Loading_Experience SHALL render an animated placeholder inside that tile.
5. WHEN an AI response streams or arrives in chunks, THE AI_Loading_Experience SHALL progressively render the response content as chunks are received rather than blocking on full completion.
6. THE AI_Loading_Experience SHALL use the UX_Theme palette and motion tokens so all loading affordances feel visually consistent with the rest of the application.

### Requirement 16: Demo Mode and Mock Data Fallback

**User Story:** As a sales rep opening Rovr for the first time or demoing it live, I want the dashboard to show a populated scenario out of the box, so that the product never appears empty or broken during a demo.

#### Acceptance Criteria

1. WHEN an authenticated user loads the dashboard and the Data_Store returns zero Customer_Records for the current `auth.uid()`, THE Rovr_Backend SHALL seed the user's workspace with the Mock_Data_Seed, including sample Customer_Records with `latitude`/`longitude` values spanning a plausible single metro area.
2. WHEN first-load seeding completes, THE Rovr_Frontend SHALL hydrate the ranked list, Map_View, KPI_Dashboard, Insights panel, and Analytics_View from the Mock_Data_Seed's precomputed rankings, route, insights, and KPI values so no panel is empty on first load.
3. THE Rovr_Frontend SHALL display a visible Demo_Mode toggle within the Dashboard_Layout accessible to authenticated users.
4. WHEN a user activates the Demo_Mode toggle, THE Rovr_Frontend SHALL load the Mock_Data_Seed scenario into the ranked list, Map_View, KPI_Dashboard, Insights panel, and Analytics_View simultaneously, revealing Demo_Mode content only once all five surfaces are populated, and SHALL NOT mutate the user's existing Customer_Records in the Data_Store.
5. WHEN a user deactivates the Demo_Mode toggle, THE Rovr_Frontend SHALL restore the view to the user's own Customer_Records, rankings, and route.
6. THE Rovr_Frontend SHALL visually indicate when Demo_Mode is active through a badge or banner styled under the UX_Theme.

### Requirement 17: Error Handling

**User Story:** As a sales rep, I want clear feedback when something fails, so that I know whether to retry, fix input, or move on.

#### Acceptance Criteria

1. THE Rovr_Backend SHALL wrap every outbound call to Supabase, Mapbox, and Gemini in a try/catch at the service boundary.
2. IF a CSV file fails to parse due to a malformed structure, THEN THE Rovr_Frontend SHALL display a user-visible error describing the parse failure and the Rovr_Backend SHALL discard the partial import.
3. IF a Mapbox Directions API or Mapbox Matrix API call returns a non-OK status or throws, THEN THE Rovr_Frontend SHALL display a toast notification referencing the map or route operation.
4. IF a Gemini API call fails after the configured retry budget is exhausted, THEN THE Rovr_Frontend SHALL display a fallback message in the affected surface (ranked list, insights section, or Copilot_Chat).
5. IF a Supabase call returns an error, THEN THE Rovr_Frontend SHALL display a toast notification referencing the affected operation.
6. WHILE any Rovr_Backend call is in flight, THE Rovr_Frontend SHALL display a loading state on the affected surface.
7. THE Rovr_Frontend SHALL render transient errors in a non-blocking toast component styled under the UX_Theme.

### Requirement 18: Environment Variable Contract

**User Story:** As a developer running Rovr locally or deploying it, I want a documented set of required environment variables, so that the app boots correctly and fails fast when configuration is missing.

#### Acceptance Criteria

1. THE Env_Contract SHALL define the following required variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_MAPBOX_TOKEN`, `MAPBOX_SECRET_TOKEN`, and `GEMINI_API_KEY`.
2. THE Env_Contract SHALL additionally define the AWS deployment variables `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_S3_BUCKET` as optional-in-development-but-required-in-AWS-environments, sourced from AWS Secrets Manager or IAM role credentials in production rather than plaintext environment files.
3. WHEN the Rovr_Backend starts, THE Rovr_Backend SHALL validate that every required variable defined in the Env_Contract is present and non-empty.
4. IF any required variable defined in the Env_Contract is missing or empty at startup, THEN THE Rovr_Backend SHALL abort startup and log a configuration error listing the missing variable names.
5. THE Rovr_Frontend SHALL read only variables prefixed with `NEXT_PUBLIC_` from the Env_Contract.
6. THE Rovr_Backend SHALL use `GEMINI_API_KEY` and `MAPBOX_SECRET_TOKEN` only in server-side code paths.

### Requirement 19: Cloud Infrastructure (Future-Facing)

**User Story:** As an engineer preparing Rovr for production, I want the infrastructure targets documented, so that the deployment work stays aligned with the product architecture even before the first AWS rollout.

#### Acceptance Criteria

1. THE Cloud_Infrastructure SHALL target AWS as the production deployment surface, using AWS Amplify for frontend hosting, AWS S3 for object storage, AWS CloudFront for CDN distribution, AWS Secrets Manager for credential storage, AWS CloudWatch for observability, and AWS IAM for access control.
2. WHILE the Rovr_Platform is running in a local development context, THE Rovr_Platform SHALL operate without any live AWS dependency and SHALL rely on local environment variables and in-process fallbacks.
3. WHERE the Rovr_Platform is deployed to AWS, THE Rovr_Backend SHALL read Gemini, Mapbox, and Supabase credentials from AWS Secrets Manager rather than from plaintext environment files at runtime.
4. THE Cloud_Infrastructure SHALL NOT be implemented by the AI intelligence track; it is owned by the maps/infrastructure teammate and is called out here solely to keep the architecture, naming, and environment contract consistent.
