<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class SupportPageController extends Controller
{
    /**
     * @var array<string, string>
     */
    private const PAGE_MAP = [
        'about-us' => 'about',
        'faqs' => 'faqs',
        'contact-us' => 'contact',
        'delivery-information' => 'delivery',
        'privacy-policy' => 'privacy',
        'terms-of-service' => 'terms',
    ];

    public function show(string $page): Response
    {
        abort_unless(array_key_exists($page, self::PAGE_MAP), 404);

        return Inertia::render('InfoPage', [
            'pageKey' => self::PAGE_MAP[$page],
        ]);
    }
}
