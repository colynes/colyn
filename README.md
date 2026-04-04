# AmaniBrew

AmaniBrew is a Laravel + React + Inertia web application for running a food and retail ordering business with both a customer storefront and a backoffice operations dashboard.

The project combines:

- a customer-facing shopping experience for products, packs, promotions, cart, checkout, tracking, and profile management
- a staff/admin backoffice for orders, dashboard monitoring, inventory, packs, promotions, expenses, users, reports, and billing
- realtime notifications using Laravel Notifications, Pusher, Laravel Echo, and Sonner

## What The Project Does

### Customer side

Customers can:

- browse products, packs, and promotions
- add items to cart
- place delivery or pickup orders
- choose precise delivery locations using Google Places or device GPS
- choose pickup time within configured working hours
- track orders
- view profile details
- receive realtime notification updates

### Backoffice side

Staff, managers, and administrators can:

- monitor pending orders from the dashboard
- view and manage orders
- dispatch orders
- manage categories and products
- manage stock-related thresholds
- manage packs and promotions
- manage customer records
- manage users and pickup working hours
- record expenses
- work with fat-client subscriptions and billing
- view reports and sales targets
- receive realtime operational notifications

## Main Features

- Customer storefront with mobile-friendly layouts
- Backoffice dashboard with pending-order monitoring
- Product, category, pack, and promotion management
- Cart and checkout flow
- Delivery vs pickup fulfillment
- GPS/location-assisted delivery address selection
- Pickup hours controlled from backoffice settings
- Realtime notification bell and popup toasts
- Role-based access using Spatie Laravel Permission
- Inventory-aware ordering and dispatch stock deduction
- Invoice and billing flows
- Expense management
- Customer profile page and order tracking

## Tech Stack

### Backend

- Laravel 12
- PHP 8.2+
- MySQL
- Inertia Laravel
- Spatie Laravel Permission
- Laravel Notifications
- Pusher PHP Server
- DomPDF

### Frontend

- React 18
- Inertia React
- Vite
- Tailwind CSS
- shadcn-style UI building blocks in local components
- Lucide React icons
- Recharts
- Sonner
- Laravel Echo
- Pusher JS
- Google Places / Maps integration

## Project Structure

Key application areas:

- [`app/Http/Controllers`](/c:/xampp/htdocs/colyn/app/Http/Controllers)
  Handles auth, checkout, storefront pages, dashboard data, operations, inventory, users, billing, and notifications.
- [`resources/js/pages`](/c:/xampp/htdocs/colyn/resources/js/pages)
  Inertia pages for customer and backoffice UIs.
- [`resources/js/components`](/c:/xampp/htdocs/colyn/resources/js/components)
  Shared UI pieces including cart, notification bell, profile, packs, and backoffice helpers.
- [`routes/web.php`](/c:/xampp/htdocs/colyn/routes/web.php)
  Main route definitions.
- [`database/migrations`](/c:/xampp/htdocs/colyn/database/migrations)
  Database schema history for packs, notifications, profile fields, delivery fields, settings, and more.

## Main Pages

### Customer pages

- `/`
- `/products`
- `/packs`
- `/promotions`
- `/cart`
- `/checkout`
- `/track-orders`
- `/customer/home`
- `/my-orders`
- `/profile`

### Backoffice pages

- `/dashboard`
- `/orders`
- `/create-order`
- `/inventory/categories`
- `/inventory/products`
- `/dashboard/packs`
- `/dashboard/promotions`
- `/customers`
- `/users`
- `/expenses`
- `/sales`
- `/reports`
- `/fat-clients/subscriptions`
- `/fat-clients/billing`

## Important Business Logic

### Orders and stock

- Product stock is managed through the `stocks` table.
- Customer cart updates and checkout validate stock availability.
- Staff-created orders also validate stock before saving.
- Stock is reduced when an order is dispatched.
- Customers should not be able to order beyond available quantity.

### Pickup flow

- Pickup working hours are managed from the backoffice users area.
- Customers choosing pickup must select a valid pickup time.
- Pickup time must stay within the configured working hours.

### Delivery flow

- Delivery location can be selected by typing an address with Google suggestions.
- Customers can also use device GPS to detect their current location.
- Delivery coordinates and notes are stored with the order.

### Notifications

- Notifications are stored in the database.
- Realtime delivery is powered by Pusher and Laravel Echo.
- Sonner displays live toast popups.
- Notification bell data is shared through Inertia props.

## Environment Variables

The project uses a standard Laravel `.env` file.

Important variables include:

```env
APP_NAME=AmaniBrew
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=amanibrew
DB_USERNAME=root
DB_PASSWORD=

SESSION_DRIVER=database
QUEUE_CONNECTION=database

BROADCAST_CONNECTION=pusher
PUSHER_APP_ID=
PUSHER_APP_KEY=
PUSHER_APP_SECRET=
PUSHER_APP_CLUSTER=

VITE_PUSHER_APP_KEY=
VITE_PUSHER_APP_CLUSTER=
VITE_GOOGLE_MAPS_API_KEY=
```

## Local Setup

### 1. Install backend dependencies

```powershell
composer install
```

### 2. Install frontend dependencies

```powershell
npm install
```

### 3. Create environment file

```powershell
copy .env.example .env
```

Then update:

- database credentials
- Pusher credentials
- Google Maps API key

### 4. Generate application key

```powershell
php artisan key:generate
```

### 5. Run migrations

```powershell
php artisan migrate
```

### 6. Link storage if needed

```powershell
php artisan storage:link
```

### 7. Start the app

You can use the combined dev script:

```powershell
composer run dev
```

That starts:

- Laravel server
- queue listener
- Vite dev server

Or run services separately:

```powershell
php artisan serve
php artisan queue:listen --tries=1 --timeout=0
npm run dev
```

## Build For Production

```powershell
npm run build
```

## Queue, Realtime, and Notifications

For the notification system to work correctly:

- `notifications` table must exist
- broadcasting must be configured
- Pusher credentials must be valid
- queue worker should be running when queued jobs are used

If configuration changes are not taking effect:

```powershell
php artisan optimize:clear
```

## Google Maps Requirements

The checkout delivery-location feature depends on:

- Google Places Autocomplete
- Geocoding / reverse geocoding
- a valid browser API key in `VITE_GOOGLE_MAPS_API_KEY`

If address suggestions or GPS-to-address conversion fail, verify:

- the API key is active
- the correct Google APIs are enabled
- key restrictions allow localhost usage

## Roles

The application supports multiple backoffice and customer roles. In the current database/history, role names may appear in mixed casing, including:

- `admin`
- `Administrator`
- `manager`
- `Manager`
- `staff`
- `customer`

Access checks and notifications should account for those variants.

## Useful Commands

```powershell
php artisan migrate
php artisan optimize:clear
php artisan queue:listen --tries=1 --timeout=0
php artisan test
npm run dev
npm run build
```

## Screens and Artifacts In Repo

The repository also includes some local screenshots and checks used during development, such as:

- [`billing-page-shot.png`](/c:/xampp/htdocs/colyn/billing-page-shot.png)
- [`create-invoice-shot.png`](/c:/xampp/htdocs/colyn/create-invoice-shot.png)
- [`invoice-preview-shot.png`](/c:/xampp/htdocs/colyn/invoice-preview-shot.png)
- [`invoice-download-check.txt`](/c:/xampp/htdocs/colyn/invoice-download-check.txt)

## Notes

- Currency formatting in the app uses `TSh` / `TZS` depending on context.
- The UI is customer-facing on the storefront and operational on the dashboard.
- The project has been customized significantly beyond the default Laravel starter.

## License

This project is currently maintained as an application codebase rather than a reusable package. If you want a formal project license section, add your preferred license here.
