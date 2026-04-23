<?php

namespace Tests\Unit;

use App\Support\BackofficeAccess;
use App\Support\RoleRegistry;
use Closure;
use Illuminate\Database\Eloquent\Builder;
use Mockery;
use PHPUnit\Framework\TestCase;

class BackofficeAccessTest extends TestCase
{
    protected function tearDown(): void
    {
        Mockery::close();

        parent::tearDown();
    }

    public function test_apply_to_user_query_builds_a_safe_case_insensitive_backoffice_role_filter(): void
    {
        $query = Mockery::mock(Builder::class);
        $roleQuery = Mockery::mock(Builder::class);
        $nameQuery = Mockery::mock(Builder::class);

        $query->shouldReceive('whereHas')
            ->once()
            ->with('roles', Mockery::on(function (Closure $callback) use ($roleQuery): bool {
                $callback($roleQuery);

                return true;
            }))
            ->andReturnSelf();

        $roleQuery->shouldReceive('where')
            ->once()
            ->with('guard_name', RoleRegistry::WEB_GUARD)
            ->andReturnSelf();

        $roleQuery->shouldReceive('where')
            ->once()
            ->with(Mockery::type(Closure::class))
            ->andReturnUsing(function (Closure $callback) use ($nameQuery, $roleQuery) {
                $callback($nameQuery);

                return $roleQuery;
            });

        $nameQuery->shouldReceive('whereRaw')->once()->with('LOWER(name) = ?', ['administrator'])->andReturnSelf();
        $nameQuery->shouldReceive('orWhereRaw')->once()->with('LOWER(name) = ?', ['admin'])->andReturnSelf();
        $nameQuery->shouldReceive('orWhereRaw')->once()->with('LOWER(name) = ?', ['manager'])->andReturnSelf();
        $nameQuery->shouldReceive('orWhereRaw')->once()->with('LOWER(name) = ?', ['staff'])->andReturnSelf();

        $this->assertSame($query, BackofficeAccess::applyToUserQuery($query));
    }
}
