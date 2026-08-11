import { describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MapLoader } from '../MapLoader';
import { afterEach } from 'vitest';

describe('MapLoader', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders initial state correctly', () => {
        const onLoad = vi.fn();
        render(<MapLoader onLoad={onLoad} status="Waiting for map..." />);

        expect(screen.getByText('Select .bsp file...')).toBeDefined();
        expect(screen.getByText('Select .wad files...')).toBeDefined();
        expect(screen.getByText('Select .fgd files...')).toBeDefined();

        const button = screen.getByRole('button', { name: 'Initialize Engine' });
        expect(button).toBeDefined();
        expect((button as HTMLButtonElement).disabled).toBe(true);
    });

    it('enables button when bsp file is selected', async () => {
        const user = userEvent.setup();
        const onLoad = vi.fn();
        const { container } = render(<MapLoader onLoad={onLoad} status="Waiting for map..." />);

        const bspInput = container.querySelector('input[accept=".bsp"]') as HTMLInputElement;
        const file = new File(['dummy content'], 'test.bsp', { type: 'application/octet-stream' });

        await user.upload(bspInput, file);

        expect(screen.getByText('test.bsp')).toBeDefined();

        const buttons = screen.getAllByRole('button', { name: 'Initialize Engine' });
        const button = buttons[0] as HTMLButtonElement;
        expect(button.disabled).toBe(false);
    });

    it('updates text when wad and fgd files are selected', async () => {
        const user = userEvent.setup();
        const onLoad = vi.fn();
        const { container } = render(<MapLoader onLoad={onLoad} status="Waiting for map..." />);

        const wadInput = container.querySelector('input[accept=".wad"]') as HTMLInputElement;
        const fgdInput = container.querySelector('input[accept=".fgd"]') as HTMLInputElement;

        const wadFiles = [
            new File(['dummy'], 'halflife.wad'),
            new File(['dummy'], 'liquids.wad')
        ];
        const fgdFile = new File(['dummy'], 'halflife.fgd');

        await user.upload(wadInput, wadFiles);
        await user.upload(fgdInput, fgdFile);

        expect(screen.getByText('2 files selected')).toBeDefined();
        expect(screen.getByText('1 files selected')).toBeDefined();
    });

    it('calls onLoad with correct arguments when button is clicked', async () => {
        const user = userEvent.setup();
        const onLoad = vi.fn();
        const { container } = render(<MapLoader onLoad={onLoad} status="Waiting for map..." />);

        const bspInput = container.querySelector('input[accept=".bsp"]') as HTMLInputElement;
        const wadInput = container.querySelector('input[accept=".wad"]') as HTMLInputElement;
        const fgdInput = container.querySelector('input[accept=".fgd"]') as HTMLInputElement;

        const bspFile = new File(['dummy'], 'test.bsp');
        const wadFile = new File(['dummy'], 'halflife.wad');
        const fgdFile = new File(['dummy'], 'halflife.fgd');

        await user.upload(bspInput, bspFile);
        await user.upload(wadInput, wadFile);
        await user.upload(fgdInput, fgdFile);

        const buttons = screen.getAllByRole('button', { name: 'Initialize Engine' });
        const button = buttons[0];
        await user.click(button);

        expect(onLoad).toHaveBeenCalledTimes(1);
        expect(onLoad).toHaveBeenCalledWith(bspFile, [wadFile], [fgdFile]);
    });

    it('disables button and shows Processing Map... when status is Loading...', () => {
        const onLoad = vi.fn();
        render(<MapLoader onLoad={onLoad} status="Loading..." />);

        const button = screen.getByRole('button', { name: 'Processing Map...' }) as HTMLButtonElement;
        expect(button).toBeDefined();
        expect(button.disabled).toBe(true);
    });
});
