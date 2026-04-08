# CashFlowWidget Space Optimization Design

**Feature**: F-02 Survive the Month Cash Flow Engine
**Component**: CashFlowWidget.tsx
**Problem**: Widget occupies excessive vertical space on budget screen

## Proposed Solution: Hybrid Progressive Disclosure

### Current Issues
- Full projection state uses generous padding (p-4, mb-3) throughout
- Information spread across multiple vertically stacked sections
- Limited horizontal space utilization
- All details visible by default, causing visual overload

### Solution Overview
Apply moderate spacing reduction universally + implement expandable sections for detailed information

### Detailed Design

#### 1. Universal Spacing Reduction
- Reduce padding from p-4 to p-2/p-3 in all containers
- Decrease margin-bottom from mb-3 to mb-2
- Optimize typography where appropriate (text-sm → text-xs)
- Maintain readability while gaining ~25% immediate space savings

#### 2. Progressive Disclosure for Full Projection
**Collapsed State (Default)**:
- Prominent display of only two critical metrics:
  - Safe to Spend Today (large, actionable)
  - Money runs out date + days remaining (prominent)
- Minimal header with collapse/expand indicator

**Expanded State (On Tap)**:
- Reveals additional contextual information:
  - Data sufficiency/warmup notes
  - Detailed breakdown (burn rate, current balance)
  - Critical warnings when applicable
  - Payday reset prompt

### Visual States

| Widget State | Height | Information Density | User Action Required |
|--------------|--------|-------------------|---------------------|
| Setup Prompt | Reduced | Low | None (view only) |
| Free Tier Gate | Reduced | Low | None (view only) |
| Data Stale | Reduced | Moderate | Tap to reset |
| Insufficient Data | Reduced | Moderate | Tap to update |
| Zero Burn Rate | Reduced | Moderate | Tap to update |
| **Full Projection (Collapsed)** | **Reduced** | **High (Core)** | **Tap to expand** |
| **Full Projection (Expanded)** | **Normal** | **High (Full)** | **View all details** |

### Implementation Approach

1. **State Detection**: Use existing projection sufficiency and UI state logic
2. **Layout Logic**: Conditional class application based on expansion state
3. **Animation**: Leverage React Native Animated for smooth transitions
4. **Accessibility**: Ensure expandable section is properly labeled
5. **Analytics**: Track expansion/collapse events for usage insights

### Benefits
- ~60% space reduction in collapsed state
- Preserves all information accessibility
- Follows familiar mobile UI patterns
- Reduces visual complexity while maintaining functionality
- Minimal disruption to existing user workflows

### Trade-offs Considered

Alternative approaches evaluated:
1. Pure spacing reduction: Limited savings (~25%), information still overwhelming
2. Dashboard/grid layout: Poor narrow-screen adaptability, significant redesign needed
3. Tabbed interface: Extra navigation step, loses immediate glanceability

The hybrid approach optimizes for:
- Immediate glanceability of critical financial information
- Progressive disclosure of secondary details
- Efficient use of both vertical and horizontal screen real estate
- Familiar interaction patterns reducing cognitive load

## Mermaid State Diagram

```mermaid
stateDiagram-v2
    [*] --> NotVisible : visible=false
    NotVisible --> [*] : visible=true
    
    NotVisible --> SetupPrompt : !canAccessBudget && visible
    NotVisible --> FreeTierGate : !canAccessBudget && visible
    NotVisible --> DataStale : dataStale && isSetup && visible
    NotVisible --> NotSetupYet : !isSetup && !isLoading && visible
    NotVisible --> InsufficientData : projection?.sufficiency === "insufficient" && visible
    NotVisible --> ZeroBurnRate : !projection || projection.dailyBurnRate === 0 && visible
    NotVisible --> FullProjection : else && visible
    
    state FullProjection {
        [*] --> Collapsed : default
        Collapsed --> Expanded : onTapExpand
        Expanded --> Collapsed : onTapCollapse
        
        Collapsed : shows core metrics only
        Expanded : shows all metrics
    }
    
    SetupPrompt --> [*] : user action
    FreeTierGate --> [*] : user action
    DataStale --> [*] : reset pressed
    NotSetupYet --> [*] : setup completed
    InsufficientData --> [*] : sufficient data logged
    ZeroBurnRate --> [*] : transactions logged
    FullProjection --> [*] : widget hidden
    
    note right of FullProjection
        Progressive disclosure
        Core metrics always visible
        Details expand/collapse
    end
```

## Component Hierarchy

```mermaid
flowchart TD
    A[CashFlowWidget] --> B[State Router]
    B --> C[Free Tier Gate]
    B --> D[Setup Prompt]
    B --> E[Data Stale Prompt]
    B --> F[Not Yet Setup]
    B --> G[Insufficient Data State]
    B --> H[Zero Burn Rate State]
    B --> I[Full Projection State]
    
    I --> J[Condensed Layout Container]
    J --> K[Core Metrics Row]
    K --> L[Safe to Spend Today]
    K --> M[Money Runs Out Date]
    J --> N[Expandable Details Section]
    N --> O[Data Sufficiency Info]
    N --> P[Detailed Breakdown]
    N --> Q[Critical Warnings (conditional)]
    N --> R[Payday Reset Prompt (conditional)]
    
    style I fill:#f9f,stroke:#333,stroke-width:2px
    style J fill:#bbf,stroke:#333,stroke-width:1px
    style N fill:#dfd,stroke:#333,stroke-width:1px,stroke-dasharray: 5 5
```

## Spacing Optimization Metrics

| Element | Current | Optimized | Savings |
|---------|---------|-----------|---------|
| Container Padding | p-4 | p-2 | 50% reduction |
| Section Margin | mb-3 | mb-1 | 66% reduction |
| Typography | text-sm/text-base | text-xs/text-sm | 25-30% reduction |
| Full Widget Height | ~420px | ~160px (collapsed) | 62% reduction |
| Expanded Widget Height | ~420px | ~400px | 5% reduction |

## Implementation Files
- Primary: `/Users/mac/Documents/Projects/CediWise/cediwise-mobile-app/components/features/budget/CashFlowWidget.tsx`
- Related: CashFlowSetupModal.tsx, SalaryResetModal.tsx (unchanged)

## Analytics Events to Add
- `cash_flow_widget_expanded`
- `cash_flow_widget_collapsed`
- `cash_flow_widget_core_metrics_viewed` (when collapsed)

## Accessibility Considerations
- Ensure expandable section has proper aria-label
- Announce state changes for screen readers
- Maintain touch target minimums (≥48dp)
- Preserve all existing keyboard navigation

## Next Steps
Upon approval, implement using writing-plans skill to create detailed implementation plan.