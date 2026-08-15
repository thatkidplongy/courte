import { describe, expect, it } from 'vitest';

import { ValidationError } from '@/domain/errors';

import { assertOwnerRemains } from './assertOwnerRemains';

describe('assertOwnerRemains', () => {
  it('allows removing an owner while another remains', () => {
    expect(() => assertOwnerRemains({ currentRole: 'owner', nextRole: null, ownerCount: 2 })).not.toThrow();
  });

  it('refuses removing the last owner', () => {
    expect(() => assertOwnerRemains({ currentRole: 'owner', nextRole: null, ownerCount: 1 })).toThrow(ValidationError);
  });

  /**
   * The path that actually locked a venue out in testing. `addStaff` is an upsert, so posting
   * the sole owner's own email with role 'staff' rewrites their row — and `manageStaff` is
   * owner-only, so nobody can ever appoint a replacement.
   */
  it('refuses demoting the last owner to staff', () => {
    expect(() => assertOwnerRemains({ currentRole: 'owner', nextRole: 'staff', ownerCount: 1 })).toThrow(
      /must keep at least one owner/
    );
  });

  it('allows demoting an owner while another remains', () => {
    expect(() => assertOwnerRemains({ currentRole: 'owner', nextRole: 'staff', ownerCount: 2 })).not.toThrow();
  });

  it('allows re-saving the last owner as an owner', () => {
    expect(() => assertOwnerRemains({ currentRole: 'owner', nextRole: 'owner', ownerCount: 1 })).not.toThrow();
  });

  it('does not care about staff at all', () => {
    expect(() => assertOwnerRemains({ currentRole: 'staff', nextRole: null, ownerCount: 1 })).not.toThrow();
    expect(() => assertOwnerRemains({ currentRole: 'staff', nextRole: 'owner', ownerCount: 1 })).not.toThrow();
  });

  it('allows adding somebody who is not yet a member', () => {
    expect(() => assertOwnerRemains({ currentRole: null, nextRole: 'staff', ownerCount: 1 })).not.toThrow();
  });
});
