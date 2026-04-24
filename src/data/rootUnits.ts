import type { RootUnit } from '../types/rootUnit';

const TOTAL = 30;

/**
 * 获取所有可用单元（30 个）及它们是否解锁的状态
 * 有 JSON 文件的单元解锁，没有的锁定
 */
export async function getAvailableRootUnits(): Promise<RootUnit[]> {
  const units: RootUnit[] = [];
  
  // 检查 unite1.json 到 unite30.json
  for (let i = 1; i <= TOTAL; i++) {
    let unlocked = false;
    try {
      // 尝试导入，如果成功则说明文件存在
      await Promise.resolve().then(() => import(`../data/unite${i}.json`));
      unlocked = true;
    } catch {
      // 文件不存在，保持 locked
    }
    
    units.push({
      id: i,
      label: `Unit ${i}`,
      locked: !unlocked,
    });
  }
  
  return units;
}

/**
 * 同步获取可用单元 ID 列表（用于初始化）
 */
export function getAvailableUnitIdsSync(): number[] {
  // 这里返回一个默认范围，实际检测在异步函数中进行
  return [1, 2]; // 默认显示前 2 个单元
}