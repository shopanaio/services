'use client';

import {
  createContext,
  useContext,
  ReactNode,
  Children,
  isValidElement,
  useMemo,
} from 'react';
import { createStyles } from 'antd-style';
import { Badge, Typography, Flex, Spin } from 'antd';

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles({
  layout: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    paddingTop: 'var(--x4)',
    paddingLeft: 'var(--x6)',
    paddingRight: 'var(--x6)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 32,
    marginBottom: 'var(--x4)',
  },
  toolbar: {
    marginBottom: 'var(--x4)',
  },
  toolbarSticky: {
    position: 'sticky',
    top: -4,
    zIndex: 100,
    background: 'var(--bg-gradient)',
    margin: '0 calc(-1 * var(--x6))',
    padding: '0 var(--x6) var(--x3)',
  },
  toolbarInner: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--x2)',
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--x2)',
    flex: 1,
  },
  toolbarCenter: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--x2)',
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--x2)',
  },
  content: {
    flex: 1,
    minHeight: 0,
  },
  footer: {
    marginTop: 'var(--x4)',
    paddingBottom: 'var(--x4)',
  },
  footerSticky: {
    position: 'sticky',
    bottom: 0,
    zIndex: 100,
    background: 'var(--bg-gradient)',
    margin: '0 calc(-1 * var(--x6))',
    padding: 'var(--x3) var(--x6) var(--x4)',
  },
  footerInner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    paddingRight: 'var(--x3)',
  },
});

// ============================================================================
// Context
// ============================================================================

interface IDataLayoutContext {
  loading?: boolean;
}

const DataLayoutContext = createContext<IDataLayoutContext>({});

export const useDataLayoutContext = () => useContext(DataLayoutContext);

// ============================================================================
// Compound Components
// ============================================================================

// --- Header ---

interface IHeaderProps {
  children: ReactNode;
  className?: string;
}

const Header = ({ children, className }: IHeaderProps) => {
  const { styles, cx } = useStyles();
  return <div className={cx(styles.header, className)}>{children}</div>;
};

Header.displayName = 'DataLayout.Header';

// --- Header Title ---

interface ITitleProps {
  children: ReactNode;
  count?: number;
}

const Title = ({ children, count }: ITitleProps) => {
  const { styles } = useStyles();

  return (
    <Badge
      data-testid="page-title-wrapper"
      data-count={count}
      color="var(--color-primary-10)"
      count={count}
      overflowCount={9999}
      offset={[count && count > 9 ? 6 : 0, 5]}
    >
      <Typography.Title level={4} className={styles.title} data-testid="page-title">
        {children}
      </Typography.Title>
    </Badge>
  );
};

Title.displayName = 'DataLayout.Title';

// --- Header Actions ---

interface IHeaderActionsProps {
  children: ReactNode;
}

const HeaderActions = ({ children }: IHeaderActionsProps) => {
  return <Flex gap="middle" align="center">{children}</Flex>;
};

HeaderActions.displayName = 'DataLayout.HeaderActions';

// --- Toolbar ---

interface IToolbarProps {
  children?: ReactNode;
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
  sticky?: boolean;
  className?: string;
}

const Toolbar = ({ children, left, center, right, sticky = true, className }: IToolbarProps) => {
  const { styles, cx } = useStyles();

  // If children provided, render as-is
  if (children) {
    return (
      <div className={cx(sticky ? styles.toolbarSticky : styles.toolbar, className)}>
        {children}
      </div>
    );
  }

  // Otherwise use slots
  return (
    <div className={cx(sticky ? styles.toolbarSticky : styles.toolbar, className)}>
      <div className={styles.toolbarInner}>
        {left && <div className={styles.toolbarLeft}>{left}</div>}
        {center && <div className={styles.toolbarCenter}>{center}</div>}
        {right && <div className={styles.toolbarRight}>{right}</div>}
      </div>
    </div>
  );
};

Toolbar.displayName = 'DataLayout.Toolbar';

// --- Toolbar slots (for composition) ---

const ToolbarLeft = ({ children }: { children: ReactNode }) => {
  const { styles } = useStyles();
  return <div className={styles.toolbarLeft}>{children}</div>;
};
ToolbarLeft.displayName = 'DataLayout.Toolbar.Left';

const ToolbarCenter = ({ children }: { children: ReactNode }) => {
  const { styles } = useStyles();
  return <div className={styles.toolbarCenter}>{children}</div>;
};
ToolbarCenter.displayName = 'DataLayout.Toolbar.Center';

const ToolbarRight = ({ children }: { children: ReactNode }) => {
  const { styles } = useStyles();
  return <div className={styles.toolbarRight}>{children}</div>;
};
ToolbarRight.displayName = 'DataLayout.Toolbar.Right';

// --- Content ---

interface IContentProps {
  children: ReactNode;
  className?: string;
}

const Content = ({ children, className }: IContentProps) => {
  const { styles, cx } = useStyles();
  const { loading } = useDataLayoutContext();

  if (loading) {
    return (
      <div className={cx(styles.content, className)}>
        <Flex justify="center" align="center" style={{ height: '100%', minHeight: 200 }}>
          <Spin size="large" />
        </Flex>
      </div>
    );
  }

  return <div className={cx(styles.content, className)}>{children}</div>;
};

Content.displayName = 'DataLayout.Content';

// --- Footer ---

interface IFooterProps {
  children?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  sticky?: boolean;
  className?: string;
}

const Footer = ({ children, left, right, sticky = true, className }: IFooterProps) => {
  const { styles, cx } = useStyles();

  // If children provided, render as-is
  if (children) {
    return (
      <div className={cx(sticky ? styles.footerSticky : styles.footer, className)}>
        {children}
      </div>
    );
  }

  // Otherwise use slots
  return (
    <div className={cx(sticky ? styles.footerSticky : styles.footer, className)}>
      <div className={styles.footerInner}>
        <div>{left}</div>
        <div>{right}</div>
      </div>
    </div>
  );
};

Footer.displayName = 'DataLayout.Footer';

// ============================================================================
// Main Component
// ============================================================================

export interface IDataLayoutProps {
  children: ReactNode;

  // Quick props (shortcuts for simple cases)
  title?: ReactNode;
  count?: number;
  actions?: ReactNode;
  toolbar?: ReactNode;
  footer?: ReactNode;

  // Behavior
  loading?: boolean;
  stickyToolbar?: boolean;
  stickyFooter?: boolean;

  // Testing
  name?: string;
  className?: string;
}

export const DataLayout = ({
  children,
  title,
  count,
  actions,
  toolbar,
  footer,
  loading,
  stickyToolbar = true,
  stickyFooter = true,
  name,
  className,
}: IDataLayoutProps) => {
  const { styles, cx } = useStyles();

  // Parse children to find compound components
  const slots = useMemo(() => {
    const result: {
      header: ReactNode | null;
      toolbar: ReactNode | null;
      content: ReactNode[];
      footer: ReactNode | null;
    } = {
      header: null,
      toolbar: null,
      content: [],
      footer: null,
    };

    Children.forEach(children, (child) => {
      if (!isValidElement(child)) {
        result.content.push(child);
        return;
      }

      const displayName = (child.type as { displayName?: string })?.displayName;

      switch (displayName) {
        case 'DataLayout.Header':
          result.header = child;
          break;
        case 'DataLayout.Toolbar':
          result.toolbar = child;
          break;
        case 'DataLayout.Footer':
          result.footer = child;
          break;
        case 'DataLayout.Content':
          result.content.push(child);
          break;
        default:
          result.content.push(child);
      }
    });

    return result;
  }, [children]);

  // Determine what to render for each section
  const headerNode = slots.header ?? (
    (title || actions) && (
      <Header>
        {title && <Title count={count}>{title}</Title>}
        {actions && <HeaderActions>{actions}</HeaderActions>}
      </Header>
    )
  );

  const toolbarNode = slots.toolbar ?? (
    toolbar && <Toolbar sticky={stickyToolbar}>{toolbar}</Toolbar>
  );

  const footerNode = slots.footer ?? (
    footer && <Footer sticky={stickyFooter}>{footer}</Footer>
  );

  const contextValue = useMemo(() => ({ loading }), [loading]);

  return (
    <DataLayoutContext.Provider value={contextValue}>
      <div
        className={cx(styles.layout, className)}
        data-testid={name ? `${name}-layout` : 'data-layout'}
      >
        {headerNode}
        {toolbarNode}
        <Content>{slots.content}</Content>
        {footerNode}
      </div>
    </DataLayoutContext.Provider>
  );
};

// Attach compound components
DataLayout.Header = Header;
DataLayout.Title = Title;
DataLayout.HeaderActions = HeaderActions;
DataLayout.Toolbar = Toolbar;
DataLayout.ToolbarLeft = ToolbarLeft;
DataLayout.ToolbarCenter = ToolbarCenter;
DataLayout.ToolbarRight = ToolbarRight;
DataLayout.Content = Content;
DataLayout.Footer = Footer;
