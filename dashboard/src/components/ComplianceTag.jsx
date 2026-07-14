import React from 'react';
import { getAllTags } from '../lib/compliance';

export default function ComplianceTag({ severity }) {
  const tags = getAllTags(severity);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
      {tags.map((tag, idx) => {
        let className = 'compliance-tag ';
        if (tag.framework === 'RBI') className += 'compliance-rbi';
        else if (tag.framework === 'PCI-DSS') className += 'compliance-pci';
        else if (tag.framework === 'SOC 2') className += 'compliance-soc2';

        return (
          <span key={idx} className={className} title={tag.control}>
            {tag.framework}
          </span>
        );
      })}
    </div>
  );
}
