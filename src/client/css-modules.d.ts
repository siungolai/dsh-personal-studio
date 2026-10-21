/**
 * CSS Modules type declaration.
 *
 * The build compiles `*.module.css` through lightningcss and hands the
 * component a class map; TypeScript needs to know the shape of that map to
 * accept `styles.root` without a cast.
 */
declare module '*.module.css' {
  const classes: Record<string, string>
  export default classes
}
