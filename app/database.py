"""
Database models and session.

The database is a SQLite database, and is stored in the root
of the project as `db.sqlite3`.

The database is managed using Alembic, and migrations
are stored in the `migrations/` directory.

The module defines the following models:

- `Repo`: A repository that is being tracked.
- `Dependency`: A dependency of a repository.
- `RepoDependency`: A relationship between a repository and a dependency.

The database is accessed asynchronously using SQLAlchemy's async API.
"""
from collections.abc import AsyncGenerator
from pathlib import PurePath
from typing import Final

from sqlalchemy import BigInteger, ForeignKey, String, Text
from sqlalchemy.ext.asyncio import (
    AsyncAttrs,
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

DB_PATH: Final[PurePath] = PurePath(__file__).parent.parent / "db.sqlite3"

SQLALCHEMY_DATABASE_URL: Final[str] = f"sqlite+aiosqlite:///{DB_PATH}"

engine: Final[AsyncEngine] = create_async_engine(SQLALCHEMY_DATABASE_URL)

async_session_maker: Final[async_sessionmaker[AsyncSession]] = async_sessionmaker(
    engine, expire_on_commit=False, autoflush=False, autocommit=False
)


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """Get an async session."""
    async with async_session_maker() as session:
        yield session


class Base(AsyncAttrs, DeclarativeBase):
    """Declarative base for database models."""

    pass


class Repo(Base):
    """A repository that is being tracked."""

    __tablename__ = "repo"
    id: Mapped[int] = mapped_column(primary_key=True)
    url: Mapped[str] = mapped_column(nullable=False, unique=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    stars: Mapped[int] = mapped_column(BigInteger, nullable=False)
    source_graph_repo_id: Mapped[int | None] = mapped_column(
        BigInteger, nullable=True, unique=True
    )
    dependencies: Mapped[list["Dependency"]] = relationship(
        "Dependency", secondary="repo_dependency", back_populates="repos"
    )


class Dependency(Base):
    """A dependency of a repository."""

    __tablename__ = "dependency"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    repos: Mapped[list["Repo"]] = relationship(
        "Repo", secondary="repo_dependency", back_populates="dependencies"
    )


class RepoDependency(Base):
    """A relationship between a repository and a dependency."""

    __tablename__ = "repo_dependency"
    repo_id: Mapped[int] = mapped_column(
        ForeignKey(Repo.id, ondelete="CASCADE"), primary_key=True
    )
    dependency_id: Mapped[int] = mapped_column(
        ForeignKey(Dependency.id, ondelete="CASCADE"), primary_key=True
    )