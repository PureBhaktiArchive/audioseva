import { subjects } from '@/abilities';
import { checkAuth, redirectSections } from '@/router';
import { mockClaims } from './helpers';

describe('redirectSections', () => {
  let to: any;
  const from: any = {};
  let next: any;

  beforeEach(() => {
    next = jest.fn();
  });

  test.each`
    claims                           | toProps                | expectedPath
    ${{ TE: { editor: true } }}      | ${{ fullPath: '/te' }} | ${'/te/my'}
    ${{ TE: { coordinator: true } }} | ${{ fullPath: '/te' }} | ${'/te/tasks'}
  `(
    'should redirect to first available child route that matches claims $claims',
    async ({ claims, expectedPath, toProps: { fullPath } }) => {
      await mockClaims(claims);
      to = {
        fullPath: fullPath,
        meta: {
          activator: true,
        },
      };
      await redirectSections(to, from, next);
      expect(next).toHaveBeenCalledWith(expectedPath);
    }
  );
});

describe('checkAuth', () => {
  let to: any;
  const from: any = {};
  let next: any;
  let handleClaims: any;

  beforeEach(() => {
    next = jest.fn();
  });

  afterEach(async () => {
    handleClaims && (await handleClaims());
  });

  it('should redirect to login when ability and no current user', async () => {
    await mockClaims();
    to = {
      fullPath: '/te/tasks',
      matched: [
        {},
        {
          meta: {
            auth: { ability: { action: 'view', subject: subjects.TE.task } },
          },
        },
      ],
    };
    await checkAuth(to, from, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith({
      path: '/login',
      query: { redirect: to.fullPath },
    });
  });

  it('should redirect to / if guestOnly and currentUser', async () => {
    handleClaims = await mockClaims({ SQR: { coordinator: true } });
    to = {
      matched: [{ meta: { auth: { guestOnly: true } } }],
    };
    await checkAuth(to, from, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith('/');
  });

  it('should redirect to /login if requireAuth and no currentUser', async () => {
    await mockClaims();
    to = {
      fullPath: '/sqr',
      matched: [{ meta: { auth: { requireAuth: true } } }],
    };
    await checkAuth(to, from, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith({
      path: '/login',
      query: { redirect: to.fullPath },
    });
  });

  it('should allow route with no auth meta', async () => {
    to = {
      matched: [{ meta: {} }],
    };
    await checkAuth(to, from, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('should not redirect on correct claims', async () => {
    handleClaims = await mockClaims({ TE: { editor: true } });

    to = {
      matched: [
        {
          meta: {
            auth: { ability: { action: 'view', subject: subjects.TE.myTasks } },
          },
        },
      ],
    };
    await checkAuth(to, from, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('should redirect to / on bad custom claims', async () => {
    handleClaims = await mockClaims({ SQR: { checker: true } });
    to = {
      matched: [
        {
          meta: {
            auth: { ability: { action: 'view', subject: subjects.TE.task } },
          },
        },
      ],
    };
    const from: any = {};
    const next: any = jest.fn();
    await checkAuth(to, from, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith('/');
  });
});
