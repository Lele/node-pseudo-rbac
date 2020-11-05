declare module 'notation'{
  interface INormalizeFunc{
    (...globs:string[][]): string[]
  }

  interface IGlob {
    union: INormalizeFunc
  }

  interface Notation {
   Glob: IGlob
  }

  export const Notation: Notation

}
