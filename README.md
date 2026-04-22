# AmaniBrew

AmaniBrew is a Laravel + React + Inertia web application for running a modern retail/food operations workflow with:

1. a customer storefront
2. a customer self-service account area
3. a full back office operations dashboard
4. real-time and push notifications
5. recurring subscription order automation

This README documents the implemented project features and how the system works end-to-end.

## 1. Product Scope

AmaniBrew supports two major experiences:

1. Customer-facing commerce:
- browsing products, packs, and promotions
- managing cart
- checkout for delivery or pickup
- order tracking
- profile management
- subscription requests and subscription lifecycle

2. Back office operations:
- dashboard metrics and pending workload
- order management and dispatch
- inventory category/product management
- pack and promotion management
- customer and staff management
- expenses, sales targets, reports
- fat-clients subscriptions and billing/invoices

## 2. Roles and Access

### Customer role
- Accesses storefront and customer account pages.
- Can place orders, track deliveries, manage profile, and manage personal subscriptions.

### Back office roles
- `administrator`, `admin`, `manager`, `staff` (case-insensitive handling in core access logic).
- Accesses dashboard and operations modules.

### Admin-only capabilities
- User/staff management and pickup working hours configuration.

## 3. Complete Customer Features

## 3.1 Public Storefront and Catalog

1. Home page (`/`)
- Active categories preview.
- *Available in English and Swahili (switch via user profile).*.
- Featured active products with availability status (`In Stock`, `Low Stock`, `Out of Stock`).
- Cart summary integration.

2. Products page (`/products`)
- Category filtering.
- Search by name/description/SKU.
- Pagination.
- Product card data includes stock-aware status and promo-aware pricing.
- Featured promotions and pack recommendations.

3. Packs page (`/packs`)
- Shows active packs.
- Shows pack composition when `pack_items` exists.
- Branch-aware pack availability from inventory.

4. Promotions page (`/promotions`)
- Shows active customer-visible promotions.
- Supports schedule-aware promotion display and promotion closing behavior.

## 3.2 Cart

1. Add/update/remove lines
- Product lines
- Pack lines
- Promotion lines

2. Stock-safe cart behavior
- Validates product quantity against available stock.
- Validates pack availability via pack component stock.

3. Cart persistence
- Session-based cart storage via `App\Support\CartManager`.

## 3.3 Checkout

1. Delivery and pickup modes
- `fulfillment_method` supports `delivery` and `pickup`.

2. Address and location support
- Delivery address fields.
- Optional latitude/longitude capture.
- Delivery notes/landmark support.

3. Pickup window validation
- Pickup opening/closing times from `app_settings`.
- Validates selected pickup time is within allowed window.
- Automatically handles next-day pickup after closing hours.

4. Guest-to-account flow
- Guests can check out and get account creation.
- Existing customer identity collisions force login to prevent duplicate identities.

5. Branch fulfillment resolution
- Chooses an active branch that can fulfill all requested stock.
- Blocks checkout with meaningful stock error messages when insufficient.

6. Order creation
- Creates customer and default address records as needed.
- Creates order and order items.
- Stores fulfillment metadata and scheduling fields.
- Sends back office new-order notifications.

## 3.4 Customer Home (`/customer/home`)

1. Personalized customer landing page.
2. Shows customer-visible promotions.
3. Shows active packs and products with availability state.
4. Includes cart summary and quick shopping actions.

## 3.5 Order Tracking and My Orders

1. Track own orders by:
- recent history
- order number
- tracking number

2. Timeline/status mapping:
- pending
- dispatched
- delivered/completed
- cancelled

3. Customer actions:
- Cancel pending orders.
- Confirm delivery on dispatched delivery orders.

4. Back office receives customer action notifications for order-cancelled/order-delivered events.

## 3.6 Profile Management (`/profile`)

1. View profile and recent orders.
2. Update:
- full name
- email
- phone
- city/country
- address
- postal code
- avatar image
3. Syncs profile updates to both `users` and `customers`.
4. Maintains default customer address record.

## 3.7 Customer Subscriptions (`/my-subscriptions`)

1. Subscription request creation
- mix of products and packs
- requested frequency and delivery days
- requested start date
- delivery address
- offered price

2. Quote workflow
- customer can accept quote
- customer can reject quote
- quote expiry handling

3. Active subscription controls
- pause
- resume
- cancel
- skip next delivery

4. Forecast and scheduling UX
- upcoming delivery preview
- estimated weekly/monthly subscription cost

5. Lifecycle behavior
- Accepting a quote converts request into active subscription.

## 4. Complete Back Office Features

## 4.1 Dashboard (`/dashboard`)

1. KPIs:
- today's sales
- today's orders
- inventory units
- monthly revenue
- active promotions
- total customers

2. Trends:
- sales target vs actual trend
- top product trend

3. Operational widgets:
- recent orders
- low stock products
- today's pending orders (includes subscriber client flags)

## 4.2 Orders (`/orders`)

1. Filter/search orders by order number, customer, status.
2. Inspect full line items and fulfillment details.
3. Update order status and details.
4. Dispatch pending orders.
5. Complete pickup orders.
6. Delete orders safely (with dependent cleanup).
7. Strong stock validation before dispatch/completion.
8. Automatic delivery record creation/update for delivery orders.
9. Customer notification on significant status changes.

## 4.3 Create Back Office Orders (`/create-order`)

1. Staff can create orders manually.
2. Select products/quantities and payment method.
3. Validates stock for selected branch.
4. Creates customer by phone if needed (or reuses existing).

## 4.4 Customers (`/customers`)

1. Search/filter customer directory.
2. View order counts and address metadata.
3. Customer profile auto-sync:
- users with customer role but missing customer profile are backfilled.

## 4.5 Inventory Categories (`/inventory/categories`)

1. Category listing with pagination/search/filter.
2. Create/update/delete categories.
3. Active/inactive toggle.
4. Prevent delete when products exist in category.

## 4.6 Inventory Products (`/inventory/products`)

1. Product listing with:
- category
- pricing
- supplier data
- stock quantity
- low stock threshold
- availability status

2. Create/update/delete products.
3. Product status toggle.
4. Price record creation/update.
5. Stock quantity and reorder-level synchronization.
6. Low-stock and out-of-stock notification broadcast to back office users.

## 4.7 Packs Admin (`/dashboard/packs`)

1. Create/update/delete packs.
2. Configure pack composition (product + quantity).
3. Manage pack price and active state.
4. Auto-build pack description from selected items.
5. Notify customer audience when a new pack goes live.

## 4.8 Promotions Admin (`/dashboard/promotions`)

1. Create/update/delete promotions.
2. Schedule promotions (`starts_at`, `ends_at`).
3. Toggle active state.
4. Promotion status interpretation:
- Scheduled
- Active
- Promotion Closed
- Inactive
5. Notify customer audience when new promotion is created.

## 4.9 Expenses (`/expenses`)

1. Expense listing with pagination.
2. Summary totals and count.
3. Create/update/delete expenses.
4. Tracks creator/editor.

## 4.10 Sales (`/sales`)

1. Daily/weekly/monthly/custom period analytics.
2. Sales target management:
- daily target
- weekly target
- monthly target
- conflict detection and overwrite support

3. Target vs actual metrics:
- variance
- achievement percentage
- order counts
- top products and category revenue

4. Uses reportable statuses: `dispatched`, `delivered`, `completed`.

## 4.11 Reports (`/reports`)

1. Filtered reporting by date range and business filters.
2. Revenue, orders, customer summaries.
3. Top products report.
4. Target/actual performance summaries.
5. Export capabilities:
- CSV export
- PDF export

## 4.12 Fat Clients Subscriptions (`/fat-clients/subscriptions`)

1. Normal subscription CRUD for staff.
2. New subscription requests review section.
3. Quote send/update flow for requests.
4. Accepted customer requests convert to normal subscriptions.
5. New-request section visibility behavior:
- only pending/quoted requests are listed
- section hides when no open requests exist
- reappears automatically when a new client subscribes

## 4.13 Fat Clients Billing (`/fat-clients/billing`)

1. Invoice listing with search/status filtering.
2. Receivables summary:
- total received
- pending payments
- overdue payments

3. Create/edit/delete invoices.
4. Invoice itemized lines with product linkage.
5. Payment linkage for paid invoices.
6. Invoice status handling (`draft`, `pending`, `paid`, `overdue`, `sent`).
7. Invoice preview, print, and download flows.

## 4.14 Staff Management (`/users`)

1. Admin-only staff user management.
2. Create/update/delete staff accounts.
3. Role assignment for:
- Administrator
- Manager
- Staff

4. Password reset for staff accounts.
5. Pickup working hours configuration.
6. Online/logged-in indication based on active sessions.

## 5. Invoicing and Document Features

1. Dedicated invoice controller for rendering invoice pages.
2. Invoice generation from existing orders when required.
3. HTML invoice view.
4. Print-friendly invoice mode.
5. PDF download via `barryvdh/laravel-dompdf`.
6. Stored invoice PDF artifact under `storage/app/public/invoices`.

## 6. Notification Features

## 6.1 In-app Notification Center

1. Notification bell component with unread counter.
2. Notification pull API:
- list unread
- mark one as read
- mark all as read

3. Notification action URLs and typed icons.
4. Periodic refresh and real-time merge behavior.

## 6.2 Real-time Notifications

1. Laravel notifications + database channel.
2. Pusher + Laravel Echo integration for real-time events.
3. Sonner toast support in UI.

## 6.3 Browser Push Notifications (Firebase Cloud Messaging)

1. Frontend token registration/removal endpoints.
2. Firebase config endpoint for web clients.
3. Server-side FCM v1 send support:
- OAuth JWT token exchange
- push payload with title/body/data/link
- stale token cleanup on unregistered/invalid responses

## 7. Subscription Automation Features

## 7.1 Scheduled Jobs

`routes/console.php` schedules:

1. `orders:send-pickup-reminders` every minute
2. `subscriptions:generate-orders` every minute

## 7.2 Subscription Order Generator

Command: `subscriptions:generate-orders`

1. Detects due active subscriptions.
2. Creates pending orders for due dates (with missed-date recovery).
3. Writes `subscription_order_logs` to prevent duplicates.
4. Recalculates `next_delivery`.
5. Notifies back office of generated orders.

## 7.3 Pickup Reminder Notifier

Command: `orders:send-pickup-reminders`

1. Finds pickup orders due in ~10 minutes.
2. Sends customer pickup reminder notifications.
3. Marks `pickup_reminder_sent_at` to avoid duplicate reminders.

## 8. Core Business Rules

1. Stock-first operations:
- cart, checkout, and dispatch are stock-validated
- pack orders expand to underlying product stock requirements

2. Dispatch behavior:
- stock decremented at dispatch/completion stage
- not at cart stage

3. Promotion visibility:
- controlled by active flag + schedule windows
- customer-visible window has slight grace behavior

4. Pickup constraints:
- pickup time must be within configured open/close hours

5. Role-aware redirects:
- back office users -> dashboard
- customer users -> customer home

## 9. Route Map (High-Level)

## 9.1 Public + Authentication

1. `/`, `/products`, `/packs`, `/promotions`, `/cart`, `/checkout`, `/track-orders`
2. `/login`, `/register`, `/forgot-password`, `/reset-password/*`, `/logout`

## 9.2 Customer Authenticated

1. `/customer/home`
2. `/my-orders`
3. `/profile`
4. `/my-subscriptions` and request/accept/reject/pause/resume/cancel/skip actions
5. `/notifications` APIs

## 9.3 Back Office Authenticated

1. `/dashboard`, `/orders`, `/create-order`
2. `/inventory/categories`, `/inventory/products`
3. `/dashboard/packs`, `/dashboard/promotions`
4. `/customers`, `/users`, `/expenses`
5. `/sales`, `/reports` (+ CSV/PDF exports)
6. `/fat-clients/subscriptions`, `/fat-clients/billing`
7. Invoice routes (`/invoices/*`)

## 10. Technical Stack

## 10.1 Backend

1. Laravel 12
2. PHP 8.2+
3. MySQL
4. Inertia Laravel
5. Spatie Laravel Permission
6. Laravel Notifications
7. Pusher PHP server
8. DomPDF (`barryvdh/laravel-dompdf`)
9. spatie/laravel-permission (roles/permissions)
10. spatie/browsershot (PDF enhancements)

## 10.2 Frontend

1. React 18
2. Inertia React
3. Vite
4. Tailwind CSS
5. Lucide React
6. Recharts
7. Sonner
8. Laravel Echo + Pusher JS
9. Firebase Web SDK
10. Google Maps / Places integrations

## 11. Key Application Areas

1. `app/Http/Controllers`
- HTTP modules for storefront, checkout, customer area, operations, billing, inventory, users, notifications.

2. `app/Services`
- Sales analytics/targets and subscription workflow services.

3. `app/Support`
- cart manager, pack availability, subscription scheduler, role access helpers.

4. `app/Console/Commands`
- subscription order automation and pickup reminders.

5. `resources/js/pages`
- all customer and back office Inertia pages.

6. `resources/js/components`
- reusable UI components including notification bell and push toggle.

7. `routes/web.php`
- full HTTP route map.

8. `database/migrations`
- schema evolution including subscriptions, invoices, notifications, inventory, targets.

## 12. Environment Variables

Use `.env.example` as baseline and set the following groups.

## 12.1 Core App + DB

```env
APP_NAME=AmaniBrew
APP_ENV=local
APP_KEY=
APP_URL=http://localhost:8000
APP_TIMEZONE=Africa/Dar_es_Salaam

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=amanibrew
DB_USERNAME=root
DB_PASSWORD=
```

## 12.2 Session / Queue / Broadcast

```env
SESSION_DRIVER=database
QUEUE_CONNECTION=sync
BROADCAST_CONNECTION=pusher
```

## 12.3 Pusher + Frontend Echo

```env
PUSHER_APP_ID=
PUSHER_APP_KEY=
PUSHER_APP_SECRET=
PUSHER_APP_CLUSTER=

VITE_PUSHER_APP_KEY="${PUSHER_APP_KEY}"
VITE_PUSHER_APP_CLUSTER="${PUSHER_APP_CLUSTER}"
VITE_BROADCAST_CONNECTION="${BROADCAST_CONNECTION}"
```

## 12.4 Google Maps

```env
VITE_GOOGLE_MAPS_API_KEY=
```

## 12.5 Firebase Push

```env
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_SENDER_ID=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_VAPID_KEY=
```

## 13. Local Setup

1. Install backend dependencies:

```powershell
composer install
```

2. Install frontend dependencies:

```powershell
npm install
```

3. Create environment file:

```powershell
copy .env.example .env
```

4. Generate app key:

```powershell
php artisan key:generate
```

5. Run migrations:

```powershell
php artisan migrate
```

6. Optional storage symlink:

```powershell
php artisan storage:link
```

7. Run development stack:

```powershell
composer run dev
```

`composer run dev` runs:

1. Laravel HTTP server
2. Vite dev server
3. scheduler worker (`php artisan schedule:work`)

## 14. Useful Commands

```powershell
php artisan migrate
php artisan optimize:clear
php artisan schedule:work
php artisan subscriptions:generate-orders
php artisan orders:send-pickup-reminders
php artisan test
npm run dev
npm run build
```

## 15. Testing and Build

1. Backend tests:

```powershell
php artisan test
```

2. Frontend production build:

```powershell
npm run build
```

## 10.3 Multilingual Support

1. Backend translations in `lang/en/` and `lang/sw/` for all UI strings.
2. Frontend supports locale switching via user `preferred_language`.
3. Configured `supported_locales`: English (en), Swahili (sw).
4. Automatic locale fallback and customer profile persistence.

## 16. Operational Notes

1. Currency is typically shown as `TZS`/`TSh` depending on UI context.
2. Notification system depends on DB notifications + broadcast configuration.
3. Subscription automation depends on scheduler being active in non-dev environments.
4. Stock integrity depends on keeping `stocks` and `pack_items` data accurate.

## 17. Security Note

1. Do not commit real credentials or private keys to source control.
2. Rotate any leaked keys immediately (mail, Firebase, Pusher, Maps, DB).
3. Prefer environment-specific secret management for production deployments.

## License

This codebase is maintained as an application project. Add your preferred formal license text if needed.
