export type RootWord = {
  /** 正面：英文单词 */
  front: string;
  /** 背面：词根拆解 + 中文释义 */
  back: string;
};

export type RootGroup = {
  id: string;
  /** 词根，如 "dict" */
  root: string;
  /** 词根含义 */
  meaning: string;
  /** 该词根下的单词卡（建议 4 张，排列为 2×2） */
  words: RootWord[];
};

/**
 * Unit 1 — 8 个词根，每个 4 个单词
 * 布局参考：4 列 × 2 行卡片网格，每个词根一个 section
 */
export const UNIT_1_ROOTS: RootGroup[] = [
  {
    id: 'dict',
    root: 'dict',
    meaning: '说、言语',
    words: [
      { front: 'predict', back: 'pre(前) + dict(说) → 预言、预测' },
      { front: 'contradict', back: 'contra(反) + dict(说) → 反驳、矛盾' },
      { front: 'dictate', back: 'dict(说) + ate(动) → 口述、命令' },
      { front: 'edict', back: 'e(出) + dict(说) → 法令、布告' },
    ],
  },
  {
    id: 'ject',
    root: 'ject',
    meaning: '投、掷',
    words: [
      { front: 'project', back: 'pro(前) + ject(投) → 投射、项目' },
      { front: 'reject', back: 're(回) + ject(投) → 拒绝、驳回' },
      { front: 'inject', back: 'in(入) + ject(投) → 注射、注入' },
      { front: 'eject', back: 'e(出) + ject(投) → 弹出、驱逐' },
    ],
  },
  {
    id: 'port',
    root: 'port',
    meaning: '运、拿',
    words: [
      { front: 'transport', back: 'trans(跨) + port(运) → 运输' },
      { front: 'import', back: 'im(入) + port(运) → 进口' },
      { front: 'export', back: 'ex(出) + port(运) → 出口' },
      { front: 'portable', back: 'port(拿) + able(能) → 便携的' },
    ],
  },
  {
    id: 'tract',
    root: 'tract',
    meaning: '拉、拖',
    words: [
      { front: 'attract', back: 'at(向) + tract(拉) → 吸引' },
      { front: 'distract', back: 'dis(散) + tract(拉) → 分心' },
      { front: 'extract', back: 'ex(出) + tract(拉) → 提取、拔出' },
      { front: 'subtract', back: 'sub(下) + tract(拉) → 减去' },
    ],
  },
  {
    id: 'struct',
    root: 'struct',
    meaning: '建造',
    words: [
      { front: 'construct', back: 'con(共同) + struct(建) → 建造' },
      { front: 'destruct', back: 'de(毁) + struct(建) → 破坏' },
      { front: 'instruct', back: 'in(内) + struct(建) → 指导、教授' },
      { front: 'structure', back: 'struct(建) + ure(名) → 结构' },
    ],
  },
  {
    id: 'spect',
    root: 'spect',
    meaning: '看',
    words: [
      { front: 'inspect', back: 'in(内) + spect(看) → 检查、视察' },
      { front: 'respect', back: 're(再) + spect(看) → 尊重' },
      { front: 'prospect', back: 'pro(前) + spect(看) → 前景、展望' },
      { front: 'retrospect', back: 'retro(回) + spect(看) → 回顾' },
    ],
  },
  {
    id: 'duct',
    root: 'duct',
    meaning: '引导',
    words: [
      { front: 'conduct', back: 'con(共) + duct(导) → 指挥、行为' },
      { front: 'produce', back: 'pro(前) + duct(导) → 生产、产生' },
      { front: 'reduce', back: 're(回) + duct(导) → 减少、降低' },
      { front: 'introduce', back: 'intro(向内) + duct(导) → 介绍、引入' },
    ],
  },
  {
    id: 'scrib',
    root: 'scrib / script',
    meaning: '写',
    words: [
      { front: 'describe', back: 'de(下) + scrib(写) → 描写、描述' },
      { front: 'prescribe', back: 'pre(前) + scrib(写) → 开处方、规定' },
      { front: 'manuscript', back: 'manu(手) + script(写) → 手稿' },
      { front: 'inscribe', back: 'in(入) + scrib(写) → 雕刻、题写' },
    ],
  },
];
