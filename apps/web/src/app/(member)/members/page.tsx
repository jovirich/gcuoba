import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { Types } from 'mongoose';
import { authOptions } from '@/lib/auth-options';
import { connectMongo } from '@/lib/server/mongo';
import {
  ClassMembershipModel,
  ClassModel,
  HouseModel,
  ProfileModel,
  UserModel,
} from '@/lib/server/models';

type DirectoryMember = {
  userId: string;
  name: string;
  photoUrl: string | null;
  houseName: string | null;
};

type DirectorySection = {
  id: string;
  title: string;
  subtitle: string;
  members: DirectoryMember[];
};

type UserRow = {
  _id: Types.ObjectId;
  name: string;
};

type ProfileRow = {
  userId: string;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  photoUrl?: string | null;
  houseId?: string | null;
};

function fullNameFromProfile(profile: ProfileRow | undefined, fallback: string): string {
  if (!profile) {
    return fallback;
  }
  const parts = [profile.firstName, profile.middleName, profile.lastName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(' ') : fallback;
}

function initialsFromName(name: string): string {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  const initials = `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`;
  return initials.toUpperCase();
}

function buildDirectoryMembers(
  userIds: string[],
  usersById: Map<string, UserRow>,
  profilesByUserId: Map<string, ProfileRow>,
  houseNameById: Map<string, string>,
): DirectoryMember[] {
  const members: DirectoryMember[] = userIds
    .map((userId) => {
      const user = usersById.get(userId);
      if (!user) {
        return null;
      }
      const profile = profilesByUserId.get(userId);
      return {
        userId,
        name: fullNameFromProfile(profile, user.name),
        photoUrl: profile?.photoUrl ?? null,
        houseName: profile?.houseId ? (houseNameById.get(profile.houseId) ?? null) : null,
      };
    })
    .filter((entry): entry is DirectoryMember => entry !== null);

  members.sort((left, right) => left.name.localeCompare(right.name));
  return members;
}

async function loadDirectory(userId: string): Promise<{
  classSection: DirectorySection | null;
}> {
  await connectMongo();

  const classMembership = await ClassMembershipModel.findOne({ userId })
    .select('classId')
    .lean<{ classId?: string }>()
    .exec();

  const classId = classMembership?.classId ?? null;

  const [classDoc, classMemberships] = await Promise.all([
    classId && Types.ObjectId.isValid(classId)
      ? ClassModel.findById(classId)
          .select('label entryYear')
          .lean<{ _id: Types.ObjectId; label: string; entryYear: number }>()
          .exec()
      : Promise.resolve(null),
    classId
      ? ClassMembershipModel.find({ classId }).select('userId').lean<Array<{ userId: string }>>().exec()
      : Promise.resolve([]),
  ]);

  const classMemberIds = Array.from(new Set(classMemberships.map((entry) => entry.userId).filter(Boolean)));
  const allUserIds = classMemberIds;

  const [users, profiles] = allUserIds.length
    ? await Promise.all([
        UserModel.find({
          _id: {
            $in: allUserIds
              .filter((id) => Types.ObjectId.isValid(id))
              .map((id) => new Types.ObjectId(id)),
          },
        })
          .select('name')
          .lean<UserRow[]>()
          .exec(),
        ProfileModel.find({ userId: { $in: allUserIds } })
          .select('userId firstName middleName lastName photoUrl houseId')
          .lean<ProfileRow[]>()
          .exec(),
      ])
    : [[], []];

  const houseIds = Array.from(
    new Set(
      profiles
        .map((profile) => profile.houseId)
        .filter((houseId): houseId is string => Boolean(houseId && Types.ObjectId.isValid(houseId))),
    ),
  );

  const houses = houseIds.length
    ? await HouseModel.find({
        _id: {
          $in: houseIds.map((id) => new Types.ObjectId(id)),
        },
      })
        .select('name')
        .lean<Array<{ _id: Types.ObjectId; name: string }>>()
        .exec()
    : [];

  const usersById = new Map(users.map((row) => [row._id.toString(), row]));
  const profilesByUserId = new Map(profiles.map((profile) => [profile.userId, profile]));
  const houseNameById = new Map(houses.map((house) => [house._id.toString(), house.name]));

  const classSection: DirectorySection | null = classId
    ? {
        id: classId,
        title: classDoc ? classDoc.label : 'Your class',
        subtitle: classDoc ? `Class of ${classDoc.entryYear}` : 'Class members',
        members: buildDirectoryMembers(classMemberIds, usersById, profilesByUserId, houseNameById),
      }
    : null;

  return { classSection };
}

export default async function MemberDirectoryPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; token?: string; status?: string } | undefined;
  if (!user?.id || !user.token) {
    redirect('/login');
  }
  if (user.status !== 'active') {
    redirect('/profile?pending=1');
  }

  const { classSection } = await loadDirectory(user.id);
  const hasSections = Boolean(classSection);

  return (
    <main className="member-page p-4 md:p-6">
      <header className="member-page-header">
        <p className="member-page-kicker">Community</p>
        <h1 className="member-page-title">Members</h1>
        <p className="member-page-subtitle">Browse your class and branch members.</p>
      </header>

      {!hasSections ? (
        <section className="surface-card p-4 text-sm text-slate-500">
          No class membership found yet.
        </section>
      ) : (
        <div className="space-y-4">
          {classSection ? (
            <section className="surface-card p-4">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">{classSection.title}</h2>
                <p className="text-sm text-slate-500">{classSection.subtitle}</p>
              </div>
              {classSection.members.length === 0 ? (
                <p className="text-sm text-slate-500">No members found.</p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {classSection.members.map((member) => (
                    <li
                      key={`class-${member.userId}`}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <article className="flex items-center gap-3">
                        <div className="h-14 w-14 overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                          {member.photoUrl ? (
                            <img
                              src={member.photoUrl}
                              alt={member.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-600">
                              {initialsFromName(member.name)}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{member.name}</p>
                          <p className="text-xs text-slate-500">{member.houseName ?? 'House not set'}</p>
                        </div>
                      </article>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </div>
      )}
    </main>
  );
}
