// CSS 모듈 및 글로벌 스타일시트 side-effect import 타입 선언 (TS2882 대응)
declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}
