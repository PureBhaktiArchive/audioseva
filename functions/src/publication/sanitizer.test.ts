import { sanitizeTopics } from './sanitizer';

describe('Sanitizer', () => {
  describe('Beginning of a line', () => {
    const createTopics = (prefix: string, text: string) =>
      Array(3)
        .fill(prefix + text)
        .join('\n');

    test.each`
      prefix     | description
      ${'- '}    | ${'Proper spaces'}
      ${'\t-\t'} | ${'Tabs instead of spaces'}
      ${' - '}   | ${'Extra space before hyphen'}
      ${'   - '} | ${'Several extra spaces before hyphen'}
      ${' -'}    | ${'Space before but not after'}
      ${'-  '}   | ${'Too many spaces after'}
      ${'-'}     | ${'No spaces after'}
      ${''}      | ${'No hyphen!'}
    `('$description', ({ prefix }) => {
      const text = `topic with hyphens  -  yes, and extra  spaces`;
      expect(sanitizeTopics(createTopics(prefix as string, text))).toEqual(
        createTopics('- ', text)
      );
    });
  });

  test('should normalize line breaks', () => {
    expect(sanitizeTopics('- topic1\r\n- topic2\r\n- topic3')).toBe(
      '- topic1\n- topic2\n- topic3'
    );
  });

  test('should normalize spaces', () => {
    expect(sanitizeTopics('- topic1\n- topic\twith\ttabs')).toBe(
      '- topic1\n- topic with tabs'
    );
  });

  test('should remove empty lines', () => {
    expect(sanitizeTopics('- topic1\n\n   \n\t- topic2\n')).toBe(
      '- topic1\n- topic2'
    );
  });

  describe('Removing ORIGINAL', () => {
    const text = '- topic1\n- topic2';

    test('On a separate line', () => {
      expect(
        sanitizeTopics(`${text}\n      ORIGINAL something goes\nhere`)
      ).toBe(text);
    });

    test('On the same line', () => {
      expect(sanitizeTopics(`${text}   ORIGINAL something goes\nhere`)).toBe(
        text
      );
    });
  });
});
