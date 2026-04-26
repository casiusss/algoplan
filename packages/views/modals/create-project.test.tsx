import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockPush = vi.hoisted(() => vi.fn());
const mockCreateProjectMutate = vi.hoisted(() => vi.fn());
const mockToastError = vi.hoisted(() => vi.fn());
const mockToastSuccess = vi.hoisted(() => vi.fn());

vi.mock("../navigation", () => ({
  useNavigation: () => ({ push: mockPush }),
}));

vi.mock("@algoplan/core/projects/mutations", () => ({
  useCreateProject: () => ({ mutateAsync: mockCreateProjectMutate }),
}));

vi.mock("@algoplan/core/hooks", () => ({
  useWorkspaceId: () => "00000000-0000-0000-0000-000000000000",
}));

vi.mock("@algoplan/core/paths", () => ({
  useCurrentWorkspace: () => ({
    id: "00000000-0000-0000-0000-000000000000",
    name: "Test Workspace",
    slug: "test-ws",
    repos: [
      { url: "https://a/b.git", description: "" },
      { url: "https://c/d.git", description: "second" },
    ],
  }),
  useWorkspacePaths: () => ({
    projectDetail: (id: string) => `/test-ws/projects/${id}`,
  }),
}));

vi.mock("@algoplan/core/workspace/queries", () => ({
  memberListOptions: () => ({
    queryKey: ["members"],
    queryFn: async () => [],
  }),
  agentListOptions: () => ({
    queryKey: ["agents"],
    queryFn: async () => [],
  }),
}));

vi.mock("@algoplan/core/workspace/hooks", () => ({
  useActorName: () => ({ getActorName: () => "" }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: [] }),
}));

vi.mock("../editor", () => {
  const ContentEditor = forwardRef(
    ({ defaultValue, placeholder }: { defaultValue?: string; placeholder?: string }, ref: unknown) => {
      const valueRef = useRef(defaultValue || "");
      useImperativeHandle(ref as React.Ref<unknown>, () => ({
        getMarkdown: () => valueRef.current,
        uploadFile: vi.fn(),
      }));
      return <div data-testid="content-editor" aria-label={placeholder ?? ""} />;
    },
  );
  ContentEditor.displayName = "ContentEditor";

  return {
    ContentEditor,
    TitleEditor: ({
      defaultValue,
      placeholder,
      onChange,
      onSubmit,
    }: {
      defaultValue?: string;
      placeholder?: string;
      onChange?: (v: string) => void;
      onSubmit?: () => void;
    }) => {
      const [value, setValue] = useState(defaultValue || "");
      return (
        <input
          type="text"
          aria-label="title"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            onChange?.(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit?.();
          }}
        />
      );
    },
  };
});

vi.mock("../issues/components/priority-icon", () => ({
  PriorityIcon: () => <span data-testid="priority-icon" />,
}));

vi.mock("../common/actor-avatar", () => ({
  ActorAvatar: () => <span data-testid="actor-avatar" />,
}));

vi.mock("@algoplan/ui/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  DialogTitle: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

vi.mock("@algoplan/ui/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ render }: { render: ReactNode }) => <>{render}</>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock("@algoplan/ui/components/ui/popover", () => ({
  Popover: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ render }: { render: ReactNode }) => <>{render}</>,
  PopoverContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@algoplan/ui/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ render }: { render: ReactNode }) => <>{render}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@algoplan/ui/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    onClick,
    type = "button",
  }: {
    children: ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    type?: "button" | "submit" | "reset";
  }) => (
    <button type={type} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock("@algoplan/ui/components/common/emoji-picker", () => ({
  EmojiPicker: () => <div data-testid="emoji-picker" />,
}));

vi.mock("@algoplan/ui/lib/utils", () => ({
  cn: (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(" "),
}));

vi.mock("sonner", () => ({
  toast: {
    error: mockToastError,
    success: mockToastSuccess,
  },
}));

import { CreateProjectModal } from "./create-project";

describe("CreateProjectModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps submit disabled until title + valid repo_url are present", async () => {
    const user = userEvent.setup();
    render(<CreateProjectModal onClose={vi.fn()} />);

    const submit = screen.getByRole("button", { name: /Create Project/i });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/title/i), "X");
    expect(submit).toBeDisabled();

    const repoInput = screen.getByLabelText(/Repository URL/i);
    await user.type(repoInput, "not a url");
    expect(submit).toBeDisabled();

    await user.clear(repoInput);
    await user.type(repoInput, "https://github.com/a/b");
    expect(submit).not.toBeDisabled();
  });

  it("exposes workspace repos as datalist suggestions", () => {
    render(<CreateProjectModal onClose={vi.fn()} />);
    const first = document.querySelector('datalist option[value="https://a/b.git"]');
    const second = document.querySelector('datalist option[value="https://c/d.git"]');
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
  });
});
