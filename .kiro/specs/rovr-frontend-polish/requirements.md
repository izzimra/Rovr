# Requirements Document

## Introduction

Rovr Frontend Polish is a presentation-layer initiative that turns the Rovr field-sales dashboard into a "funded enterprise SaaS" surface in the visual vocabulary of Stripe, Linear, Vercel, and OpenAI. The feature is strictly scoped to dark-mode-only styling, layout, micro-interactions, Framer Motion animations, premium loading states, and a ChatGPT-quality copilot chat surface. It consumes the existing Zustand stores (`customer-store`, `ai-store`, `route-store`, `kpi-store`), the existing `/api/*` routes (`/api/prioritize`, `/api/insights`, `/api/chat`, `/api/briefing`), and the existing TypeScript domain types (`Customer`, `RankedCustomer`, `AIInsight`, `ChatResponse`, `KPIData`, `OptimizedRoute`, etc.) without modifying any of them.

The feature is intentionally narrower than the broader Rovr platform spec at `.kiro/specs/rovr-platform/requirements.md`. It does not introduce new API routes, new domain types, new store semantics, new Mapbox routing logic, new Supabase access patterns, or new AI services. It only introduces React components, Tailwind styles, shadcn/ui primitives, Framer Motion animations, and micro-interaction polish on top of the already-shipped intelligence layer. Scope is the four-panel authenticated dashboard shell — TOP KPI bar, LEFT customer ranking, CENTER map container shell, RIGHT AI copilot — and the premium loading states that bind them together.

## Glossary

- **Rovr_Frontend**: The Next.js 15 App Router client-side surface delivered to the browser, restricted in this spec to presentation-layer code only.
- **Dashboard_Shell**: The four-panel authenticated dashboard layout rendered on the main route: TOP KPI bar, LEFT Customer Ranking Panel, CENTER Map Container Shell, RIGHT AI Copilot Panel.
- **KPI_Bar**: The TOP row of the Dashboard_Shell that renders KPI tiles sourced from `useKPIStore`.
- **KPI_Tile**: A single animated card inside the KPI_Bar rendering one `KPIData` field (Estimated Revenue, Route Efficiency, Travel Saved, or Priority Customers).
- **Customer_Ranking_Panel**: The LEFT panel of the Dashboard_Shell that renders the ranked customer list sourced from `useCustomerStore.ranked`.
- **Customer_Row**: A single row inside the Customer_Ranking_Panel rendering one `RankedCustomer`.
- **Priority_Tier**: The `RankedCustomer.tier` field, with values `"High"`, `"Medium"`, or `"Low"`.
- **Map_Container_Shell**: The CENTER panel of the Dashboard_Shell that renders a styled container with floating controls and a route summary header but no Mapbox GL JS SDK logic.
- **AI_Copilot_Panel**: The RIGHT panel of the Dashboard_Shell that renders the conversational copilot chat surface sourced from `useAIStore.chatHistory` and the `/api/chat` route.
- **Chat_Thread**: The scrollable list of `ChatMessage` records rendered inside the AI_Copilot_Panel.
- **Chat_Composer**: The input area at the bottom of the AI_Copilot_Panel where the user composes and submits a chat message.
- **Typing_Indicator**: The animated affordance rendered in the Chat_Thread while a copilot response is in flight (`useAIStore.isChatting === true`).
- **Markdown_Renderer**: The component inside Chat_Thread that renders the `content` field of assistant-role `ChatMessage` records as formatted Markdown.
- **Premium_Loading_State**: The collection of shimmer skeletons, animated KPI placeholders, typing indicators, and route-loading overlays rendered while any of the underlying stores report a loading flag.
- **UX_Theme**: The dark-mode-only visual system defined by this spec: `bg-zinc-950` / `#0A0A0A` base surface, deep glassmorphism (`bg-black/40 backdrop-blur-xl`), electric blue and purple gradient accents, subtle glowing borders on active states, `rounded-xl` corners, and Framer Motion transitions.
- **Glass_Surface**: A panel or card styled with the glassmorphism treatment defined by the UX_Theme (translucent background plus backdrop blur plus subtle border).
- **Motion_Tokens**: The shared Framer Motion duration, easing, and stagger values used across the Rovr_Frontend so all transitions feel consistent.
- **Zustand_Stores**: The existing stores `useCustomerStore`, `useAIStore`, `useRouteStore`, and `useKPIStore` under `src/store/`, consumed read-only except where an action is part of the store's public API.
- **API_Endpoints**: The existing Next.js route handlers `/api/prioritize`, `/api/insights`, `/api/chat`, and `/api/briefing`, consumed via `fetch` from the Rovr_Frontend.

## Requirements

### Requirement 1: Dashboard Shell Layout

**User Story:** As a field sales rep, I want a premium four-panel dashboard layout, so that I can see KPIs, prospects, the map container, and the copilot at a glance without switching screens.

#### Acceptance Criteria

1. THE Dashboard_Shell SHALL render the KPI_Bar across the TOP of the authenticated dashboard page.
2. THE Dashboard_Shell SHALL render the Customer_Ranking_Panel on the LEFT of the authenticated dashboard page.
3. THE Dashboard_Shell SHALL render the Map_Container_Shell in the CENTER of the authenticated dashboard page.
4. THE Dashboard_Shell SHALL render the AI_Copilot_Panel on the RIGHT of the authenticated dashboard page.
5. THE Dashboard_Shell SHALL apply the UX_Theme base surface color `bg-zinc-950` to the outermost page container.
6. WHERE the viewport width is at or above 1280px, THE Dashboard_Shell SHALL render the KPI_Bar, Customer_Ranking_Panel, Map_Container_Shell, and AI_Copilot_Panel simultaneously and SHALL NOT render the AI_Copilot_Panel in drawer mode.
7. WHERE the viewport width is between 768px and 1279px, THE Dashboard_Shell SHALL collapse the AI_Copilot_Panel into a toggleable drawer on the RIGHT while keeping the KPI_Bar, Customer_Ranking_Panel, and Map_Container_Shell visible.
8. THE Dashboard_Shell SHALL apply a minimum internal gutter of 16px between adjacent panels at all supported viewport widths.

### Requirement 2: Dark Mode and Visual Identity

**User Story:** As a field sales rep, I want a polished dark-mode-only interface with premium materials, so that the product feels trustworthy and expensive.

#### Acceptance Criteria

1. THE UX_Theme SHALL render the Rovr_Frontend in dark mode on every route and SHALL NOT expose a light-mode toggle.
2. THE UX_Theme SHALL apply glassmorphism using `bg-black/40 backdrop-blur-xl` (or an equivalent Tailwind composition) to every Glass_Surface.
3. THE UX_Theme SHALL apply `rounded-xl` corner radius to every KPI_Tile, Customer_Row card, AI_Copilot_Panel surface, and Map_Container_Shell card.
4. THE UX_Theme SHALL use an electric blue-to-purple gradient as the primary accent on active, selected, and high-priority states.
5. WHILE a Glass_Surface is in an active, selected, or hovered state, THE UX_Theme SHALL render a subtle glowing border using the electric blue-to-purple accent.
6. WHERE a Glass_Surface is in its normal resting state (neither active, selected, nor hovered), THE UX_Theme SHALL render the surface without the glowing border accent.
7. THE Rovr_Frontend SHALL use shadcn/ui primitives styled with Tailwind for buttons, inputs, dialogs, toggles, and menus under the UX_Theme.
8. THE Rovr_Frontend SHALL render icons from a single icon set (for example Lucide React) at consistent sizing and SHALL NOT use emoji characters as UI icons.

### Requirement 3: Motion System

**User Story:** As a field sales rep, I want smooth, snappy animations on every state change, so that the product feels responsive and deliberate.

#### Acceptance Criteria

1. THE Rovr_Frontend SHALL define Motion_Tokens as a single shared module exporting standard Framer Motion duration, easing, and stagger values.
2. WHEN a Glass_Surface mounts, THE Rovr_Frontend SHALL animate the surface with a Framer Motion fade-in and slight vertical translation using the Motion_Tokens values.
3. WHEN a user hovers an interactive card (KPI_Tile, Customer_Row, Chat_Thread message, or Map_Container_Shell floating control), THE Rovr_Frontend SHALL animate an elevation change using the Motion_Tokens values.
4. WHEN a Customer_Row is added to, removed from, or reordered within the Customer_Ranking_Panel, THE Rovr_Frontend SHALL animate the transition with Framer Motion layout animations using the Motion_Tokens values, and SHALL treat these layout animations as essential motion that continues to play even when the user agent reports `prefers-reduced-motion: reduce`.
5. THE Rovr_Frontend SHALL complete every standard transition within 300ms.
6. WHERE the user agent reports `prefers-reduced-motion: reduce`, THE Rovr_Frontend SHALL disable non-essential motion and render state changes without sustained animation.
7. THE Rovr_Frontend SHALL NOT animate hover states using scale transforms that shift adjacent layout, regardless of the user agent's motion preference.

### Requirement 4: KPI Bar and Animated Counters

**User Story:** As a field sales rep, I want the KPI tiles at the top of the dashboard to feel alive with animated counters and glow accents, so that the day's plan feels high-value and current.

#### Acceptance Criteria

1. THE KPI_Bar SHALL render four KPI_Tile instances sourced from the `kpis` field of `useKPIStore`: Estimated Revenue, Route Efficiency, Travel Saved, and Priority Customers.
2. THE KPI_Bar SHALL consume `useKPIStore` read-only and SHALL NOT mutate any field of the store other than via the store's public actions.
3. WHEN a KPI_Tile receives a new numeric value from `useKPIStore.kpis`, THE KPI_Tile SHALL animate the displayed number from the previous value to the new value using a tween completing within 800ms.
4. THE KPI_Tile for Estimated Revenue SHALL format the value as Malaysian Ringgit using the `en-MY` locale with currency code `MYR`.
5. THE KPI_Tile for Travel Saved SHALL format the value in minutes with a signed prefix when the value is negative.
6. WHEN a user hovers a KPI_Tile, THE KPI_Tile SHALL render a subtle electric blue-to-purple glow around its border.
7. THE KPI_Tile SHALL apply a subtle gradient background that varies between tiles to reinforce visual hierarchy while staying within the UX_Theme palette.
8. WHILE `useKPIStore.isLoading` is `true` or `useKPIStore.kpis` is `null`, THE KPI_Bar SHALL render a Premium_Loading_State shimmer placeholder sized to each final KPI_Tile, including when prior KPI values are still available in local component state.
9. WHERE `useKPIStore.isLoading` is `false` and `useKPIStore.kpis` is a non-null `KPIData` value, THE KPI_Bar SHALL render the four KPI_Tile instances with their live values.
10. IF `useKPIStore.error` is a non-null string, THEN THE KPI_Bar SHALL render an inline error state on each affected KPI_Tile referencing the error message.

### Requirement 5: Customer Ranking Panel

**User Story:** As a field sales rep, I want the ranked customer list to visually differentiate priority tiers with AI reasoning snippets, so that I instantly know who to visit and why.

#### Acceptance Criteria

1. THE Customer_Ranking_Panel SHALL render one Customer_Row per `RankedCustomer` in `useCustomerStore.ranked`, ordered by the `rank` field ascending.
2. THE Customer_Ranking_Panel SHALL consume `useCustomerStore` read-only and SHALL NOT mutate any field of the store other than via the store's public actions.
3. THE Customer_Row SHALL render a shadcn-style Priority_Tier badge labeled with the `tier` field value (`"High"`, `"Medium"`, or `"Low"`).
4. THE Customer_Row SHALL apply a bright electric blue-to-purple glow accent when `tier` equals `"High"`, a muted accent when `tier` equals `"Medium"`, and a subdued accent when `tier` equals `"Low"`.
5. THE Customer_Row SHALL render the `customer_name`, the rank number, and the `sales_value` formatted as Malaysian Ringgit using the `en-MY` locale with currency code `MYR`.
6. WHEN a user hovers a Customer_Row, THE Customer_Row SHALL expand to reveal the `explanation` field as an AI reasoning snippet.
7. WHEN the ordered list of `RankedCustomer` records in `useCustomerStore.ranked` changes, THE Customer_Ranking_Panel SHALL animate row enter, exit, and reorder transitions using Framer Motion layout animations and the Motion_Tokens values.
8. WHERE `useCustomerStore.ranked` is a non-empty array, THE Customer_Ranking_Panel SHALL render the Customer_Row list regardless of the values of `useCustomerStore.isLoading` and `useCustomerStore.error`.
9. WHILE `useCustomerStore.isLoading` is `true` and `useCustomerStore.ranked` is an empty array, THE Customer_Ranking_Panel SHALL render a Premium_Loading_State shimmer placeholder list sized to the Customer_Row dimensions.
10. WHERE `useCustomerStore.isLoading` is `false` and `useCustomerStore.ranked` is an empty array and `useCustomerStore.error` is `null`, THE Customer_Ranking_Panel SHALL render an empty-state card styled under the UX_Theme.
11. WHERE `useCustomerStore.ranked` transitions from an empty loading state to an empty non-loading state, THE Customer_Ranking_Panel MAY render neither the shimmer placeholder list nor the empty-state card for a transition window no longer than 300ms.
12. IF `useCustomerStore.error` is a non-null string and `useCustomerStore.ranked` is an empty array, THEN THE Customer_Ranking_Panel SHALL render an inline error card referencing the error message.

### Requirement 6: AI Copilot Panel

**User Story:** As a field sales rep, I want a ChatGPT-quality copilot chat on the right side of the dashboard, so that I can ask questions about my pipeline in natural language and feel like I have a regional sales intelligence expert at my side.

#### Acceptance Criteria

1. THE AI_Copilot_Panel SHALL render the Chat_Thread and the Chat_Composer inside a single Glass_Surface on the RIGHT of the Dashboard_Shell.
2. THE AI_Copilot_Panel SHALL consume `useAIStore` read-only for `chatHistory`, `isChatting`, and `chatError` and SHALL NOT mutate any field of the store other than via the store's public actions (`appendMessage`, `setChatting`, `setChatError`, `clearChat`).
3. THE Chat_Thread SHALL render one message bubble per `ChatMessage` in `useAIStore.chatHistory`, ordered by array position ascending.
4. THE Chat_Thread SHALL visually distinguish message bubbles with `role` equal to `"user"` from bubbles with `role` equal to `"assistant"` using different gradient backgrounds, alignment, and border treatments under the UX_Theme.
5. THE Chat_Thread SHALL render the `content` field of assistant-role `ChatMessage` records through the Markdown_Renderer, supporting at least headings, bold, italic, ordered lists, unordered lists, inline code, code blocks, and links.
6. WHEN a user submits a message with at least one character (including whitespace-only messages) via the Chat_Composer, THE AI_Copilot_Panel SHALL append a user-role `ChatMessage` to `useAIStore.chatHistory` via `appendMessage`, set `isChatting` to `true` via `setChatting`, POST the message to `/api/chat`, append the returned assistant-role `ChatMessage` via `appendMessage`, and set `isChatting` to `false` via `setChatting`.
7. THE AI_Copilot_Panel SHALL NOT modify the request or response schema of `/api/chat` and SHALL consume whatever envelope the existing endpoint returns.
8. WHILE `useAIStore.isChatting` is `true`, THE Chat_Thread SHALL render the Typing_Indicator at the bottom of the thread regardless of the value of `useAIStore.chatError`.
9. WHEN a new `ChatMessage` is appended to `useAIStore.chatHistory` or the Typing_Indicator appears, THE Chat_Thread SHALL smoothly scroll its viewport so the newest content is fully visible within 300ms.
10. IF a user submits an empty message (zero characters), THEN THE Chat_Composer SHALL suppress the submission and SHALL NOT call `/api/chat`.
11. IF a call to `/api/chat` returns a non-OK HTTP status or throws, THEN THE AI_Copilot_Panel SHALL set `chatError` via `setChatError` to a user-visible string, render the error inline inside the Chat_Thread, preserve the user's last unsent input in the Chat_Composer, and set `isChatting` to `false` via `setChatting`.
12. THE AI_Copilot_Panel SHALL render a subtle glowing border around its outer Glass_Surface while `useAIStore.isChatting` is `true`.
13. WHEN a user activates a "Clear chat" control inside the AI_Copilot_Panel, THE AI_Copilot_Panel SHALL call `useAIStore.clearChat` and SHALL NOT call any API_Endpoint.

### Requirement 7: Map Container Shell

**User Story:** As a field sales rep, I want a dark, premium map container in the center of the dashboard with a route summary header and floating controls, so that the map feels integrated with the rest of the product even before the live Mapbox rendering lands.

#### Acceptance Criteria

1. THE Map_Container_Shell SHALL render a dark Glass_Surface container occupying the CENTER of the Dashboard_Shell.
2. THE Map_Container_Shell SHALL render a route summary header sourced from `useRouteStore.route` showing the total distance in kilometers, the total duration in minutes, and the count of stops.
3. WHERE `useRouteStore.route` is `null`, THE Map_Container_Shell SHALL render the route summary header with an empty-state placeholder styled under the UX_Theme.
4. THE Map_Container_Shell SHALL render floating UI controls (for example zoom, re-center, layer toggle) as Glass_Surface buttons positioned absolutely inside the container.
5. THE Map_Container_Shell SHALL NOT import, initialize, or call Mapbox GL JS, the Mapbox Directions API, or the Mapbox Matrix API.
6. THE Map_Container_Shell SHALL NOT read or modify the `geometry` or `travelMatrix` fields of `useRouteStore.route`.
7. WHILE `useRouteStore.isOptimizing` is `true`, THE Map_Container_Shell SHALL render a Premium_Loading_State route-loading overlay covering the map container and SHALL render the route summary header regardless of the validity of `useRouteStore.route`.
8. IF `useRouteStore.error` is a non-null string, THEN THE Map_Container_Shell SHALL render an inline error state inside the container referencing the error message.
9. THE Map_Container_Shell SHALL expose a bounded rectangular region with a data attribute named `data-rovr-map-slot` so the maps teammate can later mount Mapbox GL JS into that region without modifying this spec's components.

### Requirement 8: Premium Loading States

**User Story:** As a field sales rep, I want consistent, futuristic loading affordances across the dashboard, so that the product feels intentional even while Gemini and Mapbox calls are in flight.

#### Acceptance Criteria

1. THE Premium_Loading_State SHALL render shimmer placeholders sized to the final content dimensions for every affected surface (KPI_Tile, Customer_Row, Chat_Thread, Map_Container_Shell).
2. WHILE `useAIStore.isChatting` is `true`, THE Premium_Loading_State SHALL render an animated Typing_Indicator inside the Chat_Thread.
3. WHILE `useRouteStore.isOptimizing` is `true`, THE Premium_Loading_State SHALL render a futuristic route-loading overlay inside the Map_Container_Shell.
4. WHILE `useKPIStore.isLoading` is `true` or `useKPIStore.kpis` is `null`, THE Premium_Loading_State SHALL render animated placeholders inside each KPI_Tile.
5. WHILE `useCustomerStore.isLoading` is `true`, THE Premium_Loading_State SHALL render a shimmer list inside the Customer_Ranking_Panel.
6. WHERE two or more Zustand_Stores report a loading flag simultaneously, THE Premium_Loading_State SHALL render the applicable affordance for each affected surface, and each per-surface affordance SHALL render independently without depending on the coordination of the others.
7. THE Premium_Loading_State SHALL use only the UX_Theme palette and the Motion_Tokens values.
8. WHERE the user agent reports `prefers-reduced-motion: reduce`, THE Premium_Loading_State SHALL render static placeholders without sustained shimmer animation.

### Requirement 9: Architectural Boundaries

**User Story:** As the engineer responsible for the AI intelligence layer, I want the frontend polish work to stay on the presentation side of the existing architectural boundary, so that backend contracts, Zustand store semantics, and Mapbox routing logic remain owned by their respective teammates.

#### Acceptance Criteria

1. THE Rovr_Frontend SHALL NOT modify the source files under `src/app/api/` (including `/api/prioritize`, `/api/insights`, `/api/chat`, and `/api/briefing`).
2. THE Rovr_Frontend SHALL NOT modify the TypeScript interfaces defined in `src/types/` (including `Customer`, `RankedCustomer`, `AIInsight`, `ChatResponse`, `ChatMessage`, `KPIData`, and `OptimizedRoute`).
3. THE Rovr_Frontend SHALL NOT modify the Zustand store definitions under `src/store/` (including `customer-store`, `ai-store`, `route-store`, and `kpi-store`).
4. THE Rovr_Frontend SHALL NOT import, initialize, or call Mapbox GL JS, the Mapbox Directions API, or the Mapbox Matrix API from any presentation-layer component.
5. THE Rovr_Frontend SHALL NOT import modules from `src/lib/gemini/**` into client-side React components.
6. THE Rovr_Frontend SHALL consume AI-generated content exclusively through the existing API_Endpoints.
7. THE Rovr_Frontend SHALL use Tailwind CSS, shadcn/ui primitives, and Framer Motion for all component architecture introduced by this spec.
