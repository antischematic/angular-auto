# Auto decorators for Angular

```ts
@Auto()
@Component({
   template: `{{ count }}`,
   changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyComponent {
   @Check()
   count = 0;

   @Subscribe()
   count$ = interval(1000).pipe(
      tap((value) => this.count = value + 1)
   );

   @Unsubscribe()
   subscription = new Subscription();
}
```

## Decorators

### `Check`

When the decorated value is changed, marks the view for check on the next change detection cycle. Use with `OnPush` change detection strategy.

### `Subscribe`

Subscribe to the decorated observable during `ngDoCheck`. When a value is emitted, marks the view for check. Use with `OnPush` change detection strategy.
When a value is assigned it will subscribe to the new observable and dispose the previous subscription on the next change detection cycle.

### `Unsubscribe`

Disposes the decorated subject or subscription during `ngOnDestroy`. You must still manually call `complete` and/or `unsubscribe` before assigning a new value to prevent memory leaks.
