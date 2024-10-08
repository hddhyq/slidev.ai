import { GptSessionContext } from "./chat";

export interface Outline {
  /** 标题 */
  title: string;
  /** 顺序 */
  order: number;
  /** 是否扩写 */
  expanded?: boolean;
  /** 子节点 */
  children: Outline[];
}

export interface OutlineStore {
  session: GptSessionContext[],
  title: string,
  content: Outline[],
  theme: string
}

