import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@corp/shared-types$': '<rootDir>/../../packages/shared-types/src',
    '^@corp/shared-constants$': '<rootDir>/../../packages/shared-constants/src',
    '^@corp/shared-validation$': '<rootDir>/../../packages/shared-validation/src',
  },
};

export default config;
