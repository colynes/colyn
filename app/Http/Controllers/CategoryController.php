<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Http\Requests\StoreCategoryRequest;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CategoryController extends Controller
{
    public function index(Request $request)
    {
        $categories = Category::query()
            ->when($request->search, fn($q) => $q->where('name', 'like', "%{$request->search}%")
                ->orWhere('slug', 'like', "%{$request->search}%"))
            ->when($request->status !== null && $request->status !== '', fn($q) =>
                $q->where('is_active', $request->status === 'active'))
            ->withCount('products')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Inventory/Categories', [
            'categories' => $categories,
            'filters'    => $request->only(['search', 'status']),
        ]);
    }

    public function store(StoreCategoryRequest $request)
    {
        Category::create($request->validated());
        return back()->with('success', 'Category created successfully.');
    }

    public function update(StoreCategoryRequest $request, Category $category)
    {
        $category->update($request->validated());
        return back()->with('success', 'Category updated successfully.');
    }

    public function destroy(Category $category)
    {
        if ($category->products()->exists()) {
            return back()->with('error', 'Cannot delete: category has products.');
        }
        $category->delete();
        return back()->with('success', 'Category deleted.');
    }

    public function toggleStatus(Category $category)
    {
        $category->update(['is_active' => !$category->is_active]);
        return back()->with('success', 'Category status updated.');
    }
}
