# Contributing to TimeLock Exchange

Thank you for your interest in contributing to TimeLock Exchange! This document provides guidelines and instructions for contributing to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Contribution Workflow](#contribution-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)
- [Security Vulnerabilities](#security-vulnerabilities)

---

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. By participating in this project, you agree to:

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Accept constructive criticism gracefully
- Focus on what is best for the community
- Show empathy towards other community members

---

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** v18 or higher
- **pnpm** v8 or higher (preferred) or npm
- **Clarinet** v2.0 or higher (for smart contract development)
- **Git** v2.30 or higher

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/YOUR-USERNAME/TimeLock-exchange.git
cd TimeLock-exchange
```

3. Add the upstream remote:

```bash
git remote add upstream https://github.com/AdekunleBamz/TimeLock-exchange.git
```

---

## Development Setup

### Smart Contracts

```bash
# Install Clarinet if not already installed
brew install clarinet

# Run contract tests
clarinet test

# Check contract syntax
clarinet check

# Start local devnet
clarinet integrate
```

### Frontend

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local

# Start development server
pnpm dev

# Run tests
pnpm test

# Run linting
pnpm lint
```

### Environment Variables

Create a `.env.local` file in the frontend directory:

```env
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_API_URL=https://api.testnet.hiro.so
NEXT_PUBLIC_CONTRACT_ADDRESS=ST...
```

---

## Project Structure

```
TimeLock-exchange/
├── contracts/              # Clarity smart contracts
│   ├── timelock-exchange.clar
│   ├── position-nft.clar
│   ├── fee-collector.clar
│   ├── staking-rewards.clar
│   ├── governance.clar
│   └── ...
├── tests/                  # Contract tests (TypeScript)
├── frontend/               # Next.js frontend application
│   ├── src/
│   │   ├── app/           # Next.js app router pages
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilities and helpers
│   └── public/            # Static assets
├── deployments/           # Deployment configurations
├── docs/                  # Documentation
└── settings/              # Clarinet settings
```

---

## Contribution Workflow

### 1. Create a Branch

Always create a new branch for your work:

```bash
# Sync with upstream
git fetch upstream
git checkout main
git merge upstream/main

# Create a feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description
```

### 2. Branch Naming Convention

Use the following prefixes:

| Prefix | Use Case |
|--------|----------|
| `feature/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation updates |
| `refactor/` | Code refactoring |
| `test/` | Test additions/updates |
| `chore/` | Maintenance tasks |

### 3. Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting (no code change)
- `refactor`: Code restructuring
- `test`: Tests
- `chore`: Maintenance

**Examples:**
```bash
git commit -m "feat(contracts): add batch withdrawal function"
git commit -m "fix(frontend): resolve wallet connection timeout"
git commit -m "docs: update API documentation"
```

### 4. Keep Your Branch Updated

```bash
git fetch upstream
git rebase upstream/main
```

---

## Coding Standards

### Clarity (Smart Contracts)

```clarity
;; Use descriptive constant names in UPPER-CASE
(define-constant ERR-NOT-AUTHORIZED (err u401))

;; Document public functions
;; @desc Creates a new time-locked position
;; @param amount - Amount of µSTX to lock
;; @param lock-period - Lock duration in blocks
(define-public (create-position (amount uint) (lock-period uint))
  ...)

;; Use meaningful variable names
(define-data-var total-positions uint u0)

;; Group related functions together
;; ============================================================================
;; Public Functions
;; ============================================================================
```

### TypeScript/React

```typescript
// Use TypeScript strict mode
// Prefer interfaces over types for object shapes
interface Position {
  id: number;
  amount: bigint;
  lockEndBlock: number;
}

// Use functional components with hooks
export const PositionCard: React.FC<PositionCardProps> = ({ position }) => {
  const [isLoading, setIsLoading] = useState(false);
  
  // Use useCallback for event handlers
  const handleWithdraw = useCallback(async () => {
    // ...
  }, [position.id]);
  
  return (
    // JSX
  );
};

// Export at the bottom
export default PositionCard;
```

### Naming Conventions

| Context | Convention | Example |
|---------|------------|---------|
| Components | PascalCase | `PositionCard` |
| Hooks | camelCase with 'use' | `usePositions` |
| Utilities | camelCase | `formatSTX` |
| Constants | UPPER_SNAKE_CASE | `MAX_LOCK_PERIOD` |
| Types/Interfaces | PascalCase | `Position` |
| Files (React) | PascalCase.tsx | `PositionCard.tsx` |
| Files (utils) | camelCase.ts | `utils.ts` |

---

## Testing Guidelines

### Smart Contract Tests

```typescript
// tests/timelock-exchange.test.ts
import { Clarinet, Tx, types } from '@hirosystems/clarinet-sdk';

describe('TimeLock Exchange', () => {
  it('should create a position with valid parameters', async () => {
    const accounts = simnet.getAccounts();
    const deployer = accounts.get('deployer')!;
    
    const result = simnet.callPublicFn(
      'timelock-exchange',
      'create-position',
      [types.uint(10000000), types.uint(4320), types.none()],
      deployer
    );
    
    expect(result.result).toBeOk(types.uint(1));
  });
  
  it('should reject invalid lock period', async () => {
    // Test invalid inputs
  });
});
```

### Frontend Tests

```typescript
// __tests__/components/PositionCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { PositionCard } from '@/components/PositionCard';

describe('PositionCard', () => {
  const mockPosition = {
    id: 1,
    amount: BigInt(10000000),
    lockEndBlock: 100000,
  };
  
  it('renders position details', () => {
    render(<PositionCard position={mockPosition} />);
    expect(screen.getByText('10 STX')).toBeInTheDocument();
  });
  
  it('handles withdraw action', async () => {
    const onWithdraw = jest.fn();
    render(<PositionCard position={mockPosition} onWithdraw={onWithdraw} />);
    
    fireEvent.click(screen.getByText('Withdraw'));
    expect(onWithdraw).toHaveBeenCalledWith(1);
  });
});
```

### Running Tests

```bash
# All contract tests
clarinet test

# Specific contract test
clarinet test tests/timelock-exchange.test.ts

# Frontend tests
cd frontend && pnpm test

# Frontend tests with coverage
pnpm test:coverage

# E2E tests
pnpm test:e2e
```

---

## Documentation

### Inline Documentation

- Document all public functions in Clarity contracts
- Add JSDoc comments to exported TypeScript functions
- Include type definitions for complex data structures

### README Updates

When adding new features, update relevant documentation:

- `README.md` - Project overview
- `docs/API.md` - API endpoints
- `docs/CONTRACTS.md` - Contract documentation
- Component-level README files if needed

---

## Pull Request Process

### Before Submitting

1. ✅ All tests pass (`clarinet test` and `pnpm test`)
2. ✅ Code follows style guidelines
3. ✅ Documentation is updated
4. ✅ Commit messages follow conventions
5. ✅ Branch is up to date with main

### PR Template

When creating a PR, include:

```markdown
## Summary
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe testing performed

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No console errors
- [ ] Responsive design checked
```

### Review Process

1. At least one maintainer approval required
2. All CI checks must pass
3. No merge conflicts
4. Squash commits before merging

---

## Issue Guidelines

### Bug Reports

Include:
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, browser, versions)
- Screenshots/logs if applicable

### Feature Requests

Include:
- Use case description
- Proposed solution
- Alternative approaches considered
- Potential impact on existing features

### Labels

| Label | Description |
|-------|-------------|
| `bug` | Something isn't working |
| `enhancement` | New feature request |
| `good first issue` | Good for newcomers |
| `help wanted` | Extra attention needed |
| `documentation` | Documentation improvements |
| `priority: high` | Urgent issues |

---

## Security Vulnerabilities

**Do not open public issues for security vulnerabilities.**

Instead, please report them responsibly:

1. Email: security@timelock.exchange
2. Include detailed description
3. Provide proof of concept if possible
4. Allow reasonable time for response (48 hours)

We appreciate responsible disclosure and will acknowledge contributors in our security advisories.

---

## Recognition

Contributors will be recognized in:
- GitHub contributors list
- README.md acknowledgments
- Release notes

Thank you for contributing to TimeLock Exchange! 🙏
