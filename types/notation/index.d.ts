declare module 'notation'{
  interface INormalizeFunc{
    (globs:string[]): string[]
  }

  interface IGlob {
    normalize: INormalizeFunc
  }

  interface Notation {
   Glob: IGlob
  }

  export const Notation: Notation

}
