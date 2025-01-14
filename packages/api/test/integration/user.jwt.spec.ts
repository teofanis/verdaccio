import supertest from 'supertest';

import { API_ERROR, HEADERS, HEADER_TYPE, HTTP_STATUS, TOKEN_BEARER } from '@verdaccio/core';
import { buildToken } from '@verdaccio/utils';

import { createUser, getPackage, initializeServer } from './_helper';

const FORBIDDEN_VUE = 'authorization required to access package vue';

describe('token', () => {
  describe('basics', () => {
    const FAKE_TOKEN: string = buildToken(TOKEN_BEARER, 'fake');
    test.each([['user.yaml'], ['user.jwt.yaml']])('should test add a new user', async (conf) => {
      const app = await initializeServer(conf);
      const credentials = { name: 'JotaJWT', password: 'secretPass' };
      const response = await createUser(app, credentials.name, credentials.password);
      expect(response.body.ok).toMatch(`user '${credentials.name}' created`);

      const vueResponse = await getPackage(app, response.body.token, 'vue');
      expect(vueResponse.body).toBeDefined();
      expect(vueResponse.body.name).toMatch('vue');

      const vueFailResp = await getPackage(app, FAKE_TOKEN, 'vue', HTTP_STATUS.UNAUTHORIZED);
      expect(vueFailResp.body.error).toMatch(FORBIDDEN_VUE);
    });

    test.each([['user.yaml'], ['user.jwt.yaml']])('should test add a new user', async (conf) => {
      const app = await initializeServer(conf);
      const credentials = { name: 'JotaJWT', password: 'secretPass' };
      const response = await createUser(app, credentials.name, credentials.password);
      expect(response.body.ok).toMatch(`user '${credentials.name}' created`);
      const response2 = await supertest(app)
        .put(`/-/user/org.couchdb.user:${credentials.name}`)
        .send({
          name: credentials.name,
          password: credentials.password,
        })
        .expect(HEADER_TYPE.CONTENT_TYPE, HEADERS.JSON_CHARSET)
        .expect(HTTP_STATUS.CONFLICT);
      expect(response2.body.error).toBe(API_ERROR.USERNAME_ALREADY_REGISTERED);
    });

    test.each([['user.yaml'], ['user.jwt.yaml']])(
      'should fails on login if user credentials are invalid even if jwt',
      async (conf) => {
        const app = await initializeServer(conf);
        const credentials = { name: 'newFailsUser', password: 'secretPass' };
        const response = await createUser(app, credentials.name, credentials.password);
        expect(response.body.ok).toMatch(`user '${credentials.name}' created`);
        const response2 = await supertest(app)
          .put(`/-/user/org.couchdb.user:${credentials.name}`)
          .send({
            name: credentials.name,
            password: 'BAD_PASSWORD',
          })
          .expect(HEADER_TYPE.CONTENT_TYPE, HEADERS.JSON_CHARSET)
          .expect(HTTP_STATUS.UNAUTHORIZED);
        expect(response2.body.error).toBe(API_ERROR.UNAUTHORIZED_ACCESS);
      }
    );

    test.each([['user.yaml'], ['user.jwt.yaml']])(
      'should verify if user is logged',
      async (conf) => {
        const app = await initializeServer(conf);
        const credentials = { name: 'jota', password: 'secretPass' };
        const response = await createUser(app, credentials.name, credentials.password);
        expect(response.body.ok).toMatch(`user '${credentials.name}' created`);
        const response2 = await supertest(app)
          .get(`/-/user/org.couchdb.user:${credentials.name}`)
          .set(HEADERS.AUTHORIZATION, buildToken(TOKEN_BEARER, response.body.token))
          .expect(HEADER_TYPE.CONTENT_TYPE, HEADERS.JSON_CHARSET)
          .expect(HTTP_STATUS.OK);
        expect(response2.body.ok).toBe(`you are authenticated as '${credentials.name}'`);
      }
    );
  });
});
