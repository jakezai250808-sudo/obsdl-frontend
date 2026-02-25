interface HeaderLike {
  frame_id?: string;
}

interface TransformStampedLike {
  header?: HeaderLike;
  child_frame_id?: string;
}

interface TfMessageLike {
  transforms?: TransformStampedLike[];
}

export class TfCache {
  private parentByChild = new Map<string, string>();

  updateFromTfMessage(message: unknown) {
    if (!message || typeof message !== 'object') return;

    const payload = message as TfMessageLike;
    if (!Array.isArray(payload.transforms)) return;

    payload.transforms.forEach((item) => {
      const parent = (item.header?.frame_id || '').trim();
      const child = (item.child_frame_id || '').trim();
      if (!parent || !child) return;
      this.parentByChild.set(child, parent);
    });
  }

  getFrames() {
    const frameSet = new Set<string>();
    this.parentByChild.forEach((parent, child) => {
      frameSet.add(parent);
      frameSet.add(child);
    });
    return Array.from(frameSet).sort();
  }

  getRelations() {
    return Array.from(this.parentByChild.entries())
      .map(([child, parent]) => ({ parent, child }))
      .sort((a, b) => `${a.parent}/${a.child}`.localeCompare(`${b.parent}/${b.child}`));
  }

  inferDefaultFixedFrame() {
    const frames = this.getFrames();
    const preferred = ['map', 'odom', 'base_link'];
    for (const frame of preferred) {
      if (frames.includes(frame)) return frame;
    }
    return frames[0] || '';
  }
}
