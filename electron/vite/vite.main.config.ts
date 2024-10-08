import type { ConfigEnv, UserConfig } from 'vite';
import { defineConfig, mergeConfig } from 'vite';
import { getBuildConfig, getBuildDefine, external, alias, pluginHotRestart } from './vite.base.config';
// https://vitejs.dev/config
import dotenv from "dotenv";
dotenv.config();

export default defineConfig((env) => {

  const forgeEnv = env as ConfigEnv<'build'>;
  const { forgeConfigSelf } = forgeEnv;
  const define = getBuildDefine(forgeEnv);

  const config: UserConfig = {
    build: {
      lib: {
        entry: forgeConfigSelf.entry!,
        fileName: () => '[name].js',
        formats: ['cjs'],
      },
      rollupOptions: {
        external
      },
    },
    plugins: [pluginHotRestart('restart')],
    define,
    resolve: {
      // Load the Node.js entry.
      mainFields: ['module', 'jsnext:main', 'jsnext'],
      alias
    },
    server: {
      proxy: {
        'http://api.com': {
          target: process.env.OPENAI_API_HOST,
          changeOrigin: true,
          rewrite: (path) => {
            return path.replace(/^http:\/\/api\.com/, '')
          },
        },
      }
    },
  };

  return mergeConfig(getBuildConfig(forgeEnv), config);
});
