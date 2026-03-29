/*
 * Copyright 2023-present the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Author } from "./author";
import { Book } from "./book";

export class BookService {
  private static readonly books = new Map<number, Book>([
    [1, new Book("His Dark Materials", "Philip Pullman")],
    [2, new Book("The Lion, the Witch and the Wardrobe", "C.S. Lewis")],
    [3, new Book("The Hobbit", "J.R.R. Tolkien")],
    [4, new Book("The Lord of The Rings", "J.R.R. Tolkien")],
    [5, new Book("The Silmarillion", "J.R.R. Tolkien")],
  ]);

  getBooksByAuthor(author: Author): Book[] {
    return [...BookService.books.values()].filter(
      (book) => author.name === book.author,
    );
  }

  getAuthorsByBook(booksToSearch: Book[]): Author[] {
    return [...BookService.books.values()]
      .filter((book) =>
        booksToSearch.some((candidate) => candidate.title === book.title),
      )
      .map((book) => new Author(book.author));
  }
}
