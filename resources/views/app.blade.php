<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <title inertia>Amani Brew</title>
        <link rel="shortcut icon" href="/images/amani_brew_mark.png" type="image/x-icon">
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.jsx'])
        @inertiaHead
    </head>
    <body class="font-sans antialiased text-[#0F172A] bg-[#F8FAFC]">
        @inertia
    </body>
</html>
