// Compliance mapping lookup table
// Maps alert severity to RBI Cybersecurity Framework, PCI-DSS, and SOC 2 controls

export const COMPLIANCE_MAP = {
  LOW: {
    rbi: ['CFC-3.1: Continuous monitoring of privileged access'],
    pci_dss: ['Req 10.2: Implement automated audit trails'],
    soc2: ['CC7.2: System monitoring activities'],
  },
  MEDIUM: {
    rbi: ['CFC-3.1: Continuous monitoring', 'CFC-4.2: MFA for privileged users'],
    pci_dss: ['Req 7.1: Restrict access to need-to-know', 'Req 8.3: Multi-factor authentication'],
    soc2: ['CC6.1: Logical access security', 'CC7.2: System monitoring'],
  },
  CRITICAL: {
    rbi: ['CFC-3.1: Continuous monitoring', 'CFC-5.1: Incident response activation', 'CFC-4.3: Immediate access revocation'],
    pci_dss: ['Req 7.1: Restrict access', 'Req 10.6: Review logs for anomalies', 'Req 12.10: Incident response plan'],
    soc2: ['CC6.1: Logical access security', 'CC7.3: Incident response', 'CC7.4: Incident containment'],
  },
};

export function getComplianceTags(severity) {
  return COMPLIANCE_MAP[severity] || COMPLIANCE_MAP.LOW;
}

export function getAllTags(severity) {
  const tags = getComplianceTags(severity);
  return [
    ...tags.rbi.map(t => ({ framework: 'RBI', control: t })),
    ...tags.pci_dss.map(t => ({ framework: 'PCI-DSS', control: t })),
    ...tags.soc2.map(t => ({ framework: 'SOC 2', control: t })),
  ];
}
