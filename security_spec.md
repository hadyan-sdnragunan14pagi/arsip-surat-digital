# Security Specification - E-Arsip Surat Sekolah

## Data Invariants
1. A mail document must have a valid `type` ('incoming' or 'outgoing').
2. A mail document must belong to an existing `categoryId`.
3. Only registered users (admin or staff) can create or modify records.
4. Users cannot change their own `role` once assigned by an admin.
5. `createdAt` and `creatorId` are immutable for mail and categories.
6. `updatedAt` must be updated on every write using `request.time`.

## The "Dirty Dozen" Payloads (Denial Tests)
1. **Unauthorized Create**: Create a mail document without being signed in.
2. **Identity Spoofing**: Signed-in user 'UserA' tries to create a mail with `creatorId` for 'UserB'.
3. **Role Escalation**: Regular staff tries to update their own profile to `role: 'admin'`.
4. **Invalid Type**: Create a mail with `type: 'spam'`.
5. **Orphaned Record**: Create a mail with a `categoryId` that does not exist in the categories collection.
6. **Shadow Update**: Add a field `isHacker: true` to a mail document update.
7. **Bypassing Category Check**: Regular user tries to delete a category (Admin only).
8. **Resource Poisoning**: Create a category with a name longer than 100 characters.
9. **Time Spoofing**: Provide a custom `updatedAt` string instead of `request.time`.
10. **Admin Mimicry**: Non-admin user tries to edit another user's profile.
11. **Blanket Query**: Attempt to read all user profiles as a non-admin.
12. **Immutable Field Write**: Attempt to change the `createdAt` timestamp of an existing mail.

## Security Rules Helpers (Preview)
- `isSignedIn()`: Verifies request.auth != null.
- `isAdmin()`: Checks if user exists in `/admins/$(uid)`.
- `isValidMail(data)`: Validates mail schema.
- `isValidCategory(data)`: Validates category schema.
