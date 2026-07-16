"use client";

import { Alert, App, Skeleton } from "antd";
import { ModalLayout, useModalStackContext } from "@/layouts/modals";
import { QuestionDetailsCard } from "../../components/question-details-card";
import { useQuestion } from "../../hooks";
import { useQuestionEditModal, type QuestionModalPayload } from "../../modals";
import { useContentActions } from "../../../shared/hooks";
import { useExternalReferenceModal, useModerationCaseModal } from "../../../management/modals";
import { useManagementMutations } from "../../../management/hooks";

export function QuestionModal() {
  const { message } = App.useApp();
  const { payload, pop, forcePop } = useModalStackContext();
  const value = payload as QuestionModalPayload;
  const query = useQuestion(value.entityId);
  const actions = useContentActions();
  const { push: openEdit } = useQuestionEditModal();
  const { push: openCase } = useModerationCaseModal();
  const { push: openExternalReference } = useExternalReferenceModal();
  const managementMutations = useManagementMutations();
  const question = query.question;

  const refresh = async () => { await query.refetch(); await value.onSaved?.(); };
  const handleDelete = async () => {
    if (!question) return;
    const result = await actions.deleteQuestion({ id: question.id, expectedRevision: question.revision });
    if (!result.id || result.errors.length) throw new Error(result.errors.map((item) => item.message).join(" ") || "Unable to delete question");
    await value.onSaved?.(); message.success("Question deleted"); forcePop();
  };
  const handleRedact = async () => {
    if (!question) return;
    const result = await actions.redact(question.id, question.revision);
    if (!result.content || result.errors.length) throw new Error(result.errors.map((item) => item.message).join(" ") || "Unable to redact question");
    await refresh(); message.success("Question redacted");
  };
  const handleRestore = async (revision: number) => {
    if (!question) return;
    const result = await actions.restoreRevision(question.id, revision, question.revision);
    if (!result.content || result.errors.length) return message.error(result.errors.map((item) => item.message).join(" ") || "Unable to restore revision");
    await refresh(); message.success(`Revision ${revision} restored`);
  };
  const handleSubscriptionUpdate = async (subscriptionId: string, expectedUpdatedAt: string, status: import("@/graphql/types").ProductQuestionSubscriptionStatus) => {
    const result = await managementMutations.updateSubscription(subscriptionId, expectedUpdatedAt, { status });
    if (result.errors.length) { message.error(result.errors.map((item) => item.message).join(" ")); return; }
    await refresh(); message.success("Subscription updated");
  };

  return <ModalLayout name="question-details" headerProps={{ title: "Question details", onClose: pop, submitButtonProps: null }}>
    {query.loading && !question ? <Skeleton active paragraph={{ rows: 14 }} /> : null}
    {query.error || actions.error ? <Alert type="error" showIcon message={(query.error ?? actions.error)?.message} /> : null}
    {!query.loading && !question ? <Alert type="error" showIcon message="Question not found" /> : null}
    {question ? <QuestionDetailsCard question={question} onEdit={(section) => openEdit({ entityId: question.id, section, onSaved: refresh })} onDelete={handleDelete} onRedact={handleRedact} onRestoreRevision={handleRestore} onCreateCase={() => openCase({ contentId: question.id, onSaved: refresh })} onManageExternalReferences={() => openExternalReference({ contentId: question.id, onSaved: refresh })} onUpdateSubscription={handleSubscriptionUpdate} /> : null}
  </ModalLayout>;
}
