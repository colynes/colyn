<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Branch extends Model
{
    protected $fillable = ['name', 'address', 'phone', 'manager_id', 'is_active'];

    protected $casts = ['is_active' => 'boolean'];

    public function manager()
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    public function stocks()
    {
        return $this->hasMany(Stock::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }
}
