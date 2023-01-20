import babel from 'rollup-plugin-babel'

import packageJson from './package.json'

const babelOpts = {
  presets: ['es2015-rollup', 'flow'],
  plugins: [
    'transform-object-rest-spread',
    ['transform-es2015-for-of', { loose: true }]
  ]
}

export default {
  input: 'src/redux-pixies.js',
  output: [
    { file: packageJson.main, format: 'cjs' },
    { file: packageJson.module, format: 'es' }
  ],
  plugins: [babel(babelOpts)],
  sourcemap: true
}
