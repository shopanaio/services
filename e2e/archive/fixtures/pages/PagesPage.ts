import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import path from 'path';

export class PagesPage {
  private page: Page;
  private url = '/pages';
  private pageLocator: Locator;
  public title: string;
  public slug: string;

  constructor(page: Page) {
    this.page = page;
    this.pageLocator = this.page.getByTestId('create-button');
    this.title = 'Page title';
    this.slug = '';
  }

  async openPages() {
    await this.page.getByTestId('sidebar-menu-item-online-store').click();
    await this.page.getByTestId('sidebar-menu-item-pages').click();
  }

  async openCreate() {
    await this.page.getByTestId('create-button').click();
  }

  async openEditPage(string: string) {
    await this.page.getByText(string).click();
  }

  async changeStatus(status: 'Published' | 'Draft' | 'Archived') {
    await this.page.getByTestId('status-select').click();
    await this.page.getByTitle(status).click();
  }

  async fillPagesTitle(text: string) {
    await this.page.getByTestId('title-input').fill(text);
  }

  async saveTitleInConstructor() {
    const titleInput = this.page.getByTestId('title-input');
    const titleValue = await titleInput.inputValue();

    this.title = titleValue;
  }

  async checkTitle() {
    const title = await this.page.getByTestId('title-input').inputValue();
    expect(title).toBe(this.title);
  }

  async clickSlugLockButton() {
    await this.page.getByTestId('slug-lock-button').click();
  }

  async checkSlugAccordingEditedSlug() {
    const slugInput = this.page.getByTestId('slug-input');
    const value = await slugInput.inputValue();

    expect(value).toBe(this.slug);
  }

  async checkSlugAccordingTitle() {
    const slugInput = this.page.getByTestId('slug-input');
    const value = await slugInput.inputValue();
    const title = this.title;

    const expectedSlug = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    expect(value).toBe(expectedSlug);
  }

  async saveSlugInConstructor() {
    const slugInput = this.page.getByTestId('slug-input');
    const value = await slugInput.inputValue();

    this.slug = value;
  }

  async changeSlug(value: string) {
    const slugInput = this.page.getByTestId('slug-input');

    await slugInput.fill(value);
  }

  async clickDescription() {
    await this.page.getByRole('tab', { name: 'Description' }).click();
  }

  async fillDescription(string: string) {
    await this.page.locator('[data-testid="rich-text-editor"]').click();
    await this.page.locator('[data-testid="rich-text-editor"] [role="textbox"]').fill(string);
  }

  async checkDescription() {
    const description = await this.page
      .locator('[data-testid="rich-text-editor"] [role="textbox"]')
      .innerText();

    expect(description).not.toBe('');
  }

  async clickUploadCover() {
    await this.page.getByTestId('cover-image-button').click();
  }

  async uploadCover(url: string) {
    await this.page.getByTestId('upload-from-url-button').click();

    await this.page.getByPlaceholder('https://').fill(url);
    await this.page.getByTestId('upload-modal-submit-button').click();
  }

  async clickUploadGallery() {
    await this.page.getByTestId('gallery-image-button').click();
  }

  async uploadGalleryImg(url: string) {
    const filePath = path.resolve(url);

    const fileInput = this.page
      .getByRole('dialog', { name: 'Browse files' })
      .getByTestId('upload-input');

    await fileInput.setInputFiles(filePath);
    await this.page.waitForTimeout(500);
  }

  async removeImg() {
    await this.page.getByTestId('cover-clear-button').click();
  }

  async clickSaveDescription() {
    await this.page.getByTestId('save-richtext-button').click();
  }

  async clickExcerpt() {
    await this.page.getByRole('tab', { name: 'Excerpt' }).click();
  }

  async fillExcerpt(string: string) {
    await this.page.getByTestId('excerpt-editor').fill(string);
  }

  async checkExcerpt() {
    const excerpt = this.page;
    await this.page.getByTestId('excerpt-editor').innerText();

    expect(excerpt).not.toBe('');
  }

  async saveAndExitPages() {
    await this.page.waitForTimeout(500);
    await this.page.getByTestId('submit-and-exit-button').click();
    await this.page.waitForTimeout(500);
  }

  async clickSavePages() {
    await this.page.waitForTimeout(200);
    await this.page.getByTestId('submit-form-button').click();
    await this.page.waitForTimeout(200);
  }

  async reloadPage() {
    await this.page.reload();
  }
}
